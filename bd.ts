import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";

type AppConfig = {
  file?: string;
  info: boolean;
  debug: boolean;
  withTimes: boolean;
  timesAsChanged: boolean;
  withPerms: boolean;
  permsAsChanged: boolean;
  withOwn: boolean;
  ownAsChanged: boolean;
  withAttr: boolean;
  attrAsChanged: boolean;
  dryRun?: boolean;
};

class BinaryReader {
  offset: number = 0;
  private buffer: Uint8Array = new Uint8Array(0);
  private view: DataView;
  private streamReader: ReadableStreamDefaultReader<Uint8Array>;
  private finished: boolean = false
  constructor(private stream: ReadableStream<Uint8Array>, public littleEndian: boolean = true) {
    this.view = new DataView(this.buffer.buffer);
    this.streamReader = this.stream.getReader();
  }

  private appendBuffer(chunk: Uint8Array) {
    const tmp = new Uint8Array(this.buffer.length + chunk.length);
    tmp.set(this.buffer, 0);
    tmp.set(chunk, this.buffer.length);
    this.buffer = tmp;
    this.view = new DataView(this.buffer.buffer);
    console.log(`Buffer: ${this.buffer.length} bytes view=${this.view}`, this.view);
  }

  private async ensureAvailable(length: number, optional: boolean = true): Promise<void> {
    while (this.buffer.length < length) {
      const { done, value } = await this.streamReader.read();
      if (value)
        this.appendBuffer(value);
      if (done) {
        if (!optional)
          throw new Error("Unexpected end of stream");
        else
          this.finished = true;
        break
      }
    }
    this.view = new DataView(this.buffer.buffer);
  }

  async readUInt16(): Promise<number> {
    await this.ensureAvailable(2);
    const value = this.view.getUint16(0, this.littleEndian);
    this.offset += 2;
    this.buffer = this.buffer.slice(2);
    return value;
  }

  async readUInt32(): Promise<number> {
    await this.ensureAvailable(4);
    const value = this.view.getUint32(0, this.littleEndian);
    this.offset += 4;
    this.buffer = this.buffer.slice(4);
    return value;
  }

  async readUInt64(): Promise<bigint> {
    await this.ensureAvailable(4);
    const value = this.view.getBigUint64(0, this.littleEndian);
    this.offset += 8;
    this.buffer = this.buffer.slice(8);
    return value;
  }

  async readTimespec(): Promise<Temporal.Instant> {
    await this.ensureAvailable(12);
    const seconds = this.view.getBigInt64(0, this.littleEndian);
    const nanoseconds = this.view.getUint32(8, this.littleEndian);
    this.offset += 12;
    this.buffer = this.buffer.slice(12);
    const instant = Temporal.Instant.fromEpochNanoseconds(seconds * 1_000_000_000n + BigInt(nanoseconds));
    return instant
  }

  async readUuid(): Promise<string> {
    const length = 16;
    await this.ensureAvailable(length);
    const uuidBytes = this.buffer.slice(0, length);
    this.offset += length;
    this.buffer = this.buffer.slice(length);
    const uuid = Array.from(uuidBytes)
      .map((byte) => byte.toString(16))
      .join('');
    return uuid;
  }

  async readString(length: number): Promise<string> {
    await this.ensureAvailable(length);
    const bytes = this.buffer.slice(0, length);
    this.offset += length;
    this.buffer = this.buffer.slice(length);
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes);
  }

  async isAvailable(): Promise<boolean> {
    await this.ensureAvailable(1, true);
    const res = !this.finished || this.buffer.length > 0
    // console.log(`isAvailable ${this.buffer.length} ${this.finished} => ${res}`);
    return res
  }

  async close() {
    await this.streamReader.cancel();
  }
}
class BtrfsCommandType {
  constructor(
    public name: string, // Human-readable name
    public specCode: string, // Specification name
    public binaryCode: number // Numeric code in the binary format
  ) { }

  // Display command details as a string
  display(): string {
    return `${this.name} (${this.specCode}, 0x${this.binaryCode.toString(16)})`;
  }

  toString(): string {
    return this.display();
  }

  private static commands: BtrfsCommandType[] = [
    new BtrfsCommandType("Unspecified", "BTRFS_SEND_C_UNSPEC", 0),
    new BtrfsCommandType("Subvolume", "BTRFS_SEND_C_SUBVOL", 1),
    new BtrfsCommandType("Snapshot", "BTRFS_SEND_C_SNAPSHOT", 2),
    new BtrfsCommandType("Create File", "BTRFS_SEND_C_MKFILE", 3),
    new BtrfsCommandType("Create Directory", "BTRFS_SEND_C_MKDIR", 4),
    new BtrfsCommandType("Create Node", "BTRFS_SEND_C_MKNOD", 5),
    new BtrfsCommandType("Create FIFO", "BTRFS_SEND_C_MKFIFO", 6),
    new BtrfsCommandType("Create Socket", "BTRFS_SEND_C_MKSOCK", 7),
    new BtrfsCommandType("Create Symlink", "BTRFS_SEND_C_SYMLINK", 8),
    new BtrfsCommandType("Rename", "BTRFS_SEND_C_RENAME", 9),
    new BtrfsCommandType("Hard Link", "BTRFS_SEND_C_LINK", 10),
    new BtrfsCommandType("Unlink", "BTRFS_SEND_C_UNLINK", 11),
    new BtrfsCommandType("Remove Directory", "BTRFS_SEND_C_RMDIR", 12),
    new BtrfsCommandType("Set XAttr", "BTRFS_SEND_C_SET_XATTR", 13),
    new BtrfsCommandType("Remove XAttr", "BTRFS_SEND_C_REMOVE_XATTR", 14),
    new BtrfsCommandType("Write", "BTRFS_SEND_C_WRITE", 15),
    new BtrfsCommandType("Clone", "BTRFS_SEND_C_CLONE", 16),
    new BtrfsCommandType("Truncate", "BTRFS_SEND_C_TRUNCATE", 17),
    new BtrfsCommandType("Chmod", "BTRFS_SEND_C_CHMOD", 18),
    new BtrfsCommandType("Chown", "BTRFS_SEND_C_CHOWN", 19),
    new BtrfsCommandType("Update Times", "BTRFS_SEND_C_UTIMES", 20),
    new BtrfsCommandType("End", "BTRFS_SEND_C_END", 21),
    new BtrfsCommandType("Update Extent", "BTRFS_SEND_C_UPDATE_EXTENT", 22),
    new BtrfsCommandType("Fallocate", "BTRFS_SEND_C_FALLOCATE", 23),
    new BtrfsCommandType("File Attributes", "BTRFS_SEND_C_FILEATTR", 24),
    new BtrfsCommandType("Encoded Write", "BTRFS_SEND_C_ENCODED_WRITE", 25),
  ];

  // Static lookup for commands by binary code
  private static lookupMap: Record<number, BtrfsCommandType> = Object.fromEntries(
    BtrfsCommandType.commands.map((cmd) => [cmd.binaryCode, cmd])
  );

  // Static method to get a command by binary code
  static of(binaryCode: number): BtrfsCommandType | undefined {
    return BtrfsCommandType.lookupMap[binaryCode];
  }
}

class BtrfsAttributeType {
  constructor(
    public shortname: string,
    public name: string, // Human-readable name
    public specCode: string, // Specification code
    public binaryCode: number, // Numeric binary code
    public dataType: "invalid" | "uuid" | "u64" | "timespec" | "string" | "data" | "u32" // Data type as described in the specification
  ) { }

  // Display attribute details as a string
  display(): string {
    return `${this.shortname}/${this.specCode}#${this.binaryCode}:${this.dataType}`;
  }

  toString(): string {
    return `${this.name} (${this.specCode}, 0x${this.binaryCode.toString(16)}, Type: ${this.dataType})`;
  }

  /** See https://btrfs.readthedocs.io/en/latest/dev/dev-send-stream.html#attributes-tlv-types */
  private static attributes: BtrfsAttributeType[] = [
    // Version 1
    new BtrfsAttributeType("res", "Unspecified", "BTRFS_SEND_A_UNSPEC", 0, "invalid"),
    new BtrfsAttributeType("uuid", "UUID", "BTRFS_SEND_A_UUID", 1, "uuid"),
    new BtrfsAttributeType("ctransid", "Creation Transaction ID", "BTRFS_SEND_A_CTRANSID", 2, "u64"),
    new BtrfsAttributeType("ino", "Inode", "BTRFS_SEND_A_INO", 3, "u64"),
    new BtrfsAttributeType("size", "Size", "BTRFS_SEND_A_SIZE", 4, "u64"),
    new BtrfsAttributeType("mode", "Mode", "BTRFS_SEND_A_MODE", 5, "u64"),
    new BtrfsAttributeType("uid", "User ID", "BTRFS_SEND_A_UID", 6, "u64"),
    new BtrfsAttributeType("gid", "Group ID", "BTRFS_SEND_A_GID", 7, "u64"),
    new BtrfsAttributeType("rdev", "Device", "BTRFS_SEND_A_RDEV", 8, "u64"),
    new BtrfsAttributeType("ctime", "Creation Time", "BTRFS_SEND_A_CTIME", 9, "timespec"),
    new BtrfsAttributeType("mtime", "Modification Time", "BTRFS_SEND_A_MTIME", 10, "timespec"),
    new BtrfsAttributeType("atime", "Access Time", "BTRFS_SEND_A_ATIME", 11, "timespec"),
    new BtrfsAttributeType("otime", "Original Time", "BTRFS_SEND_A_OTIME", 12, "timespec"),
    new BtrfsAttributeType("xattr_name", "XAttr Name", "BTRFS_SEND_A_XATTR_NAME", 13, "string"),
    new BtrfsAttributeType("xattr_data", "XAttr Data", "BTRFS_SEND_A_XATTR_DATA", 14, "data"),
    new BtrfsAttributeType("path", "Path", "BTRFS_SEND_A_PATH", 15, "string"),
    new BtrfsAttributeType("path_to", "Path To", "BTRFS_SEND_A_PATH_TO", 16, "string"),
    new BtrfsAttributeType("path_link", "Path Link", "BTRFS_SEND_A_PATH_LINK", 17, "string"),
    new BtrfsAttributeType("file_offset", "File Offset", "BTRFS_SEND_A_FILE_OFFSET", 18, "u64"),
    new BtrfsAttributeType("data", "Data", "BTRFS_SEND_A_DATA", 19, "data"),
    new BtrfsAttributeType("clone_uuid", "Clone UUID", "BTRFS_SEND_A_CLONE_UUID", 20, "uuid"),
    new BtrfsAttributeType("clone_ctransid", "Clone Transaction ID", "BTRFS_SEND_A_CLONE_CTRANSID", 21, "u64"),
    new BtrfsAttributeType("clone_path", "Clone Path", "BTRFS_SEND_A_CLONE_PATH", 22, "string"),
    new BtrfsAttributeType("clone_offset", "Clone Offset", "BTRFS_SEND_A_CLONE_OFFSET", 23, "u64"),
    new BtrfsAttributeType("clone_len", "Clone Length", "BTRFS_SEND_A_CLONE_LEN", 24, "u64"),
    // Version 2
    new BtrfsAttributeType("fallocate_mode", "Fallocate Mode", "BTRFS_SEND_A_FALLOCATE_MODE", 25, "u32"),
    new BtrfsAttributeType("file_attrs", "File Attributes", "BTRFS_SEND_A_FILEATTR", 26, "u64"),
    new BtrfsAttributeType("unencoded_file_len", "Unencoded File Length", "BTRFS_SEND_A_UNENCODED_FILE_LEN", 27, "u64"),
    new BtrfsAttributeType("unencoded_len", "Unencoded Length", "BTRFS_SEND_A_UNENCODED_LEN", 28, "u64"),
    new BtrfsAttributeType("unencoded_offset", "Unencoded Offset", "BTRFS_SEND_A_UNENCODED_OFFSET", 29, "u64"),
    new BtrfsAttributeType("compression", "Compression", "BTRFS_SEND_A_COMPRESSION", 30, "u32"),
    new BtrfsAttributeType("encryption", "Encryption", "BTRFS_SEND_A_ENCRYPTION", 31, "u32"),
  ];

  // Static lookup for attributes by binary code
  private static lookupMap: Record<number, BtrfsAttributeType> = Object.fromEntries(
    BtrfsAttributeType.attributes.map((attr) => [attr.binaryCode, attr])
  );

  // Static method to get an attribute by binary code
  static of(binaryCode: number): BtrfsAttributeType {
    return BtrfsAttributeType.lookupMap[binaryCode];
  }
}

// Enum-like class for operation types
class Operation {
  private constructor(public readonly name: string/* , public readonly code: string */) { }

  static readonly UNSPEC = new Operation("!!!");
  static readonly IGNORE = new Operation("ignored");
  static readonly CREATE = new Operation("added");
  static readonly MODIFY = new Operation("changed");
  static readonly TIMES = new Operation("times");
  static readonly PERMISSIONS = new Operation("perms");
  static readonly OWNERSHIP = new Operation("own");
  static readonly ATTRIBUTES = new Operation("attr");
  static readonly DELETE = new Operation("deleted");
  static readonly RENAME = new Operation("renamed");
  static readonly END = new Operation("END");
}
class Node {
  children: Map<string, Node> = new Map();
  constructor(
    public name: string,
    public state: Operation,
    public parent: Node | null = null,
    public original: Node | null = null,
  ) { }
}

class BtrfsCommand {
  constructor(
    public type: BtrfsCommandType,
    public size: number,
    public checksum: number,
    public data: string,
  ) { }
}
class Diff {
  constructor(
    public original: Node = new Node("/", Operation.UNSPEC),
    public current: Node = new Node("/", Operation.UNSPEC),
  ) { }

  async readStream(child: Deno.ChildProcess): Promise<void> {
    const decoder = new TextDecoder();

    // Process stderr to capture error messages
    const stderrReader = child.stderr?.getReader();
    const stderrProcess = async () => {
      if (stderrReader) {
        while (true) {
          const { value, done } = await stderrReader.read();
          if (done) break;
          if (value) {
            const errorText = decoder.decode(value);
            console.error(`[btrfs stderr] ${errorText}`);
          }
        }
        stderrReader.releaseLock();
      }
    };

    // Run both stderr and stdout processing in parallel
    await Promise.all([stderrProcess(), this.readCommands(child.stdout)]);

    // Await the child process to ensure it's finished
    const status = await child.status;
    if (!status.success) {
      throw new Error(`Child process failed with exit code ${status.code}`);
    }
  }

  public async readCommands(input: ReadableStream<Uint8Array>): Promise<BtrfsCommand> {
    const reader = new BinaryReader(input);
    try {
      const header = await reader.readString(13); // 'btrfs-stream' is 12 bytes
      console.debug(`Header: ${header}`);
      if (header !== "btrfs-stream\0") {
        throw new Error(`Invalid header: expected 'btrfs-stream', got '${header}'`);
      }
      const version = await reader.readUInt32();
      if (version !== 1) {
        throw new Error(`Invalid btrfs version: ${version}`);
      }
      console.log(`Header: `, { version });
      while (await reader.isAvailable()) {
        const cmdSize = await reader.readUInt32();
        const cmdEndOffset = reader.offset + cmdSize;
        const cmdType = BtrfsCommandType.of(await reader.readUInt16());
        const cmdChecksum = await reader.readUInt32();
        console.log(`Command: `, { cmdType, cmdSize, cmdChecksum });
        while (reader.offset < cmdEndOffset) {
          const offset = reader.offset;
          const typeCode = await reader.readUInt16();
          const type = BtrfsAttributeType.of(typeCode)
          if (type === undefined) {
            throw new Error(`Invalid attribute type: ${typeCode}`);
          }
          const size = await reader.readUInt16();
          const attrOffset = reader.offset;
          let data
          if (type.dataType === "string")
            data = await reader.readString(size)
          else if (type.dataType === "u64")
            data = await reader.readUInt64()
          else if (type.dataType === "uuid")
            data = await reader.readUuid()
          else if (type.dataType === "timespec")
            data = await reader.readTimespec()
          else if (type.dataType === "data")
            data = await reader.readString(size)
          else if (type.dataType === "u32")
            data = await reader.readUInt32()
          else
            throw new Error(`Unsupported data type: ${type.dataType}`);
          console.log(`Attribute: `, { offset, type: type.display(), size, data_type: typeof data, data });
          if (reader.offset != attrOffset + size) {
            throw new Error(`Attribute overflow: actual ${reader.offset} != expected ${attrOffset + size}`);
          }
        }
      }
    } finally {
      reader.close();
    }
  }

  private getOperationByName(name: string): Operation | null {
    const operations = Object.values(Operation) as Operation[];
    return operations.find((op) => op.name === name) || null;
  }

  processSingleParamOp(op: Operation, path: string): void {
    this.logDebug(`Processing operation ${op.name} on path: ${path}`);
    const parts = path.split("/").filter(Boolean);
    let parent = this.current;

    parts.forEach((part, index) => {
      if (!parent.children.has(part)) {
        parent.children.set(part, new Node(part, Operation.UNSPEC, parent));
      }
      parent = parent.children.get(part)!;

      if (index === parts.length - 1) {
        parent.state = op;
        if (op === Operation.DELETE) {
          parent.children.clear();
        }
      }
    });

    this.logInfo("Tree state updated:");
    this.printTree();
  }

  processTwoParamsOp(op: Operation, fromPath: string, toPath: string): void {
    console.log(`Processing operation ${op.name} from: ${fromPath} to: ${toPath}`);

    const fromParts = fromPath.split("/").filter(Boolean);
    const toParts = toPath.split("/").filter(Boolean);

    let fromNode = this.current;
    let toParent = this.current;

    // Traverse to find the `from` node
    fromParts.forEach((part) => {
      if (!fromNode.children.has(part)) {
        throw new Error(`Path not found: ${fromPath}`);
      }
      fromNode = fromNode.children.get(part)!;
    });

    // Traverse to find/create the `to` node's parent
    toParts.slice(0, -1).forEach((part) => {
      if (!toParent.children.has(part)) {
        toParent.children.set(part, new Node(part, Operation.UNSPEC, toParent));
      }
      toParent = toParent.children.get(part)!;
    });

    const toName = toParts[toParts.length - 1];
    if (!toParent.children.has(toName)) {
      toParent.children.set(toName, new Node(toName, Operation.UNSPEC, toParent));
    }

    const toNode = toParent.children.get(toName)!;

    if (op === Operation.RENAME) {
      // Handle renaming: detach `fromNode` and reattach it under the `to` parent
      if (fromNode.parent) {
        fromNode.parent.children.delete(fromNode.name);
      }
      fromNode.name = toName;
      fromNode.parent = toParent;
      toParent.children.set(toName, fromNode);
      fromNode.state = Operation.CREATE;
    } else {
      throw new Error(`Unsupported operation: ${op.name}`);
    }

    // Debugging the current tree state after operation
    console.log("Current state of the tree after operation:");
    this.printTree();
  }

  printTree(node: Node = this.current, indent = ""): void {
    console.log(`${indent}${node.name} (${node.state.name})`);
    for (const child of node.children.values()) {
      this.printTree(child, indent + "  ");
    }
  }

  currentChanges(): string[] {
    const changes: string[] = [];
    this.traverseTree(this.current, "", changes);
    return changes;
  }

  private traverseTree(node: Node, prefix: string, changes: string[]): void {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    changes.push(`${node.state.name}: ${path}`);
    for (const child of node.children.values()) {
      this.traverseTree(child, path, changes);
    }
  }

  private logInfo(message: string): void {
    if (this.config?.info) {
      console.log(`[INFO] ${message}`);
    }
  }

  private logDebug(message: string): void {
    if (this.config?.debug) {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

class DiffApp {
  private diff: Diff;

  constructor(private config: AppConfig) {
    this.diff = new Diff();
  }

  async getChangesFromStreamFile(streamfile: string): Promise<Diff> {
    console.log(`Reading changes from stream file: ${streamfile}`);
    // // Logic for parsing the stream file
    // this.readStream(); // Placeholder for actual stream parsing
    // return this.currentChanges();

    const diff = new Diff();
    try {
      const stream = await Deno.open(streamfile)
      diff.readCommands(stream.readable)
    } catch (error) {
      console.error(`Error executing btrfs send: ${error.message}`);
      throw error;
    }
    return diff;
  }

  async getChangesFromTwoSubvolumes(parent: string, child: string): Promise<Diff> {
    try {
      // Validate the directories
      const parentStat = await Deno.stat(parent);
      if (!parentStat.isDirectory) {
        throw new Error(`'${parent}' is not a directory`);
      }

      const childStat = await Deno.stat(child);
      if (!childStat.isDirectory) {
        throw new Error(`'${child}' is not a directory`);
      }

      // Perform the BTRFS diff logic
      return this.btrfsSendDiff(parent, child);
    } catch (err: any) {
      throw new Error(`Error comparing subvolumes: ${err.message}`, err);
    }
  }

  async btrfsSendDiff(source: string, subvolume: string): Promise<Diff> {
    const diff = new Diff();
    try {
      diff.readStream(await this.runCommand(`btrfs send -p "${source}" "${subvolume}"`))
    } catch (error) {
      console.error(`Error executing btrfs send: ${error.message}`);
      throw error;
    }
    return diff;
  }

  async runCommand(command: string | string[]): Promise<Deno.ChildProcess> {
    // Parse the command if it is a single string
    const commandArray =
      typeof command === "string"
        ? command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((arg) => arg.replace(/(^"|"$)/g, "")) || []
        : command;
    // Format the command for logging (add quotes to arguments with spaces)
    const formattedCommand = commandArray
      .map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))
      .join(" ");
    // Handle dry run
    if (this.config.dryRun) {
      console.log(`[DRY RUN] ${formattedCommand}`);
      return null as unknown as Deno.ChildProcess; // Return null explicitly in a type-safe way
    }
    console.log(`[RUN] ${formattedCommand}`);
    // Spawn the command process
    const cmd = new Deno.Command(commandArray[0], {
      args: commandArray.slice(1),
      stdout: "piped",
      stderr: "piped",
    });
    return cmd.spawn();
  }
}

await new Command<AppConfig>()
  .name("btrfs-diff")
  .description("Analyse the differences between two related btrfs subvolumes.")
  .option("-f, --file <stream:string>", "Use a STREAM file to get the btrfs operations.")
  .option("-i, --info", "Enable verbose output.")
  .option("-v, --verbose", "Enable debug output.")
  .option("-d, --dry-run", "Dry run. Defaults to true.")
  .option("-t, --with-times [mode:string]", "Include time modifications.")
  .option("-p, --with-perms [mode:string]", "Include permission modifications.")
  .option("-o, --with-own [mode:string]", "Include ownership modifications.")
  .option("-a, --with-attr [mode:string]", "Include attribute modifications.")
  .arguments("[parent:string] [child:string]") // Make parent and child optional
  .action(async (config: AppConfig, parent?: string, child?: string) => {
    const diff = new DiffApp(config);

    // Validate input: either `--file` or both `parent` and `child` must be provided
    if (config.file) {
      const streamfile = Deno.realPathSync(config.file);
      console.log(`Processing stream file: ${streamfile}`);
      const changes = await diff.getChangesFromStreamFile(streamfile);
      if (changes.length > 0) {
        changes.sort();
        console.log(changes.join("\n"));
        Deno.exit(1);
      }
    } else if (parent && child) {
      const parentPath = Deno.realPathSync(parent);
      const childPath = Deno.realPathSync(child);
      console.log(`Comparing parent: ${parentPath} and child: ${childPath}`);
      const changes = await diff.getChangesFromTwoSubvolumes(parentPath, childPath);
      if (changes.length > 0) {
        changes.sort();
        console.log(changes.join("\n"));
        Deno.exit(1);
      }
    } else {
      console.error("Error: You must specify either '--file' or both <parent> and <child> arguments.");
      Deno.exit(1);
    }
  })
  .parse(Deno.args);

