# Btrfs Diff

```shell
sudo btrfs-diff /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
btrfs-diff --file c.dump
```

## Installing

```shell
# install deno
curl -fsSL https://deno.land/install.sh | sh
# make it available for sudo
sudo ln -s /home/raiseru/.deno/bin/deno /usr/local/bin/deno
sudo deno --version
<<OUT
deno 2.1.5 (stable, release, x86_64-unknown-linux-gnu)
v8 13.0.245.12-rusty
typescript 5.6.2
OUT
# install script
deno install --global --allow-read --allow-run --unstable-temporal -n btrfs-diff https://raw.githubusercontent.com/raisercostin/btrfs-diff-ts/refs/heads/main/bd.ts
#deno uninstall -g btrfs-diff
#/home/raiseru/.deno/bin/
```

## Usage

```shell
# Without installing this can be run directly
# deno run https://raw.githubusercontent.com/raisercostin/btrfs-diff-ts/refs/heads/main/bd.ts --help
btrfs-diff
<<OUT
Error: You must specify either '--file' or both <parent> and <child> arguments.

  Usage: btrfs-diff [parent] [child]

  Description:

    Analyse the differences between two related btrfs subvolumes.

  Options:

    -h, --help                  - Show this help.
    -f, --file        <stream>  - Use a STREAM file to get the btrfs operations.
    -i, --info                  - Enable verbose output.
    -v, --verbose               - Enable debug output.
    -d, --dry-run               - Dry run. Defaults to true.
    -t, --with-times  [mode]    - Include time modifications.
    -p, --with-perms  [mode]    - Include permission modifications.
    -o, --with-own    [mode]    - Include ownership modifications.
    -a, --with-attr   [mode]    - Include attribute modifications.
OUT
```

## ToDo: Requirements, Specs

- Reply/advertise here https://www.reddit.com/r/btrfs/comments/ky1d12/btrfs_snapshot_diff/
- Format
  - human readable
    - usable by tree?
  - systems readable
    - tree

## Previous work

- sync tools
  - rsync
  - unison https://www.cis.upenn.edu/~bcpierce/unison/index.html
    - https://github.com/bcpierce00/unison/wiki#documentation-and-user-information
    - https://raw.githubusercontent.com/bcpierce00/unison/documentation/unison-manual.txt
    - [Intellisync](https://www.intellisync.com.mx/portal/)
    - [Reconcile](https://www.merl.com/publications/docs/TR99-14.pdf)
- btrfs diffs
  - https://github.com/openSUSE/snapper
- diffs

## Development

### Resources

The binary format created by `btrfs send` is here:
https://btrfs.readthedocs.io/en/latest/dev/dev-send-stream.html#attributes-tlv-types

## Test

### Prepare Test Volumes on linux/wsl

Create a Btrfs filesystem in a temporary RAM-based disk:

```shell
# Create a RAM Disk
sudo mkdir -p /mnt/ramdisk1
sudo mount -t tmpfs -o size=512M tmpfs /mnt/ramdisk1

# Create a Sparse Btrfs Image File
dd if=/dev/zero of=/mnt/ramdisk1/btrfs-v1.img bs=1M count=200

# Format the Image as Btrfs
mkfs.btrfs /mnt/ramdisk1/btrfs-v1.img

# Mount the Btrfs Volume
sudo mkdir -p /volume1/test
sudo mount -o loop /mnt/ramdisk1/btrfs-v1.img /volume1/test

# Change Ownership to the Current User
sudo chown $USER:$USER /volume1/test

ls -al /volume1/test
```

Cleanup when done:

```shell
# Cleanup When Done
To clean up after testing:
sudo umount /volume1/test
sudo umount /mnt/ramdisk1
sudo rm -r /mnt/ramdisk1
```

### Prepare Test Volumes on synology

Synology already have /volume1 as btrfs so is enough to create a subvolume `/volume1/test`
```shell
sudo opkg install tree
sudo btrfs subvolume delete /volume1/test
sudo btrfs subvolume create /volume1/test
sudo chmod -R 777 /volume1/test
sudo ls -al /volume1/test
```

### Create Test Fixture

Assuming `/volume1/test` and `/volume2/test` are two different btrfs volumes, so no shared extents(shared data blocks) between them.

Create test source files and snapshots

```shell
echo "file1" > /volume1/test/file1.txt
echo "file2-torename" > /volume1/test/file2-torename.txt
echo "file3-todelete" > /volume1/test/file3-todelete.txt
echo "file4-tochange" > /volume1/test/file4-tochange.txt
mkdir -p /volume1/test/b
echo "b-file1" > /volume1/test/b/bfile1.txt
echo "b-file2-torename" > /volume1/test/b/bfile2-torename.txt
echo "b-file3-todelete" > /volume1/test/b/bfile3-todelete.txt
echo "b-file4-tochange" > /volume1/test/b/bfile4-tochange.txt
sudo btrfs subvolume snapshot /volume1/test /volume1/test/#snapshots-snap1

tree -L 4 /volume1/test -f -p -gs -F -D --timefmt "%Y-%m-%d--%H-%M-%S" --inodes -h --metafirst | tee file1.tree
<<OUT
[    256 drwxr-xr-x raiseru   160 2025-01-11--14-53-57]  /volume1/test/
[    256 drwxr-xr-x raiseru   128 2025-01-11--14-53-25]  ├── /volume1/test/#snapshots-snap1/
[    261 drwxr-xr-x raiseru   134 2025-01-11--14-53-25]  │   ├── /volume1/test/#snapshots-snap1/b/
[    262 -rw-r--r-- raiseru     8 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap1/b/bfile1.txt
[    263 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap1/b/bfile2-torename.txt
[    264 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap1/b/bfile3-todelete.txt
[    265 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   └── /volume1/test/#snapshots-snap1/b/bfile4-tochange.txt
[    257 -rw-r--r-- raiseru     6 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap1/file1.txt
[    258 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap1/file2-torename.txt
[    259 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap1/file3-todelete.txt
[    260 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   └── /volume1/test/#snapshots-snap1/file4-tochange.txt
[    261 drwxr-xr-x raiseru   134 2025-01-11--14-53-25]  ├── /volume1/test/b/
[    262 -rw-r--r-- raiseru     8 2025-01-11--14-53-25]  │   ├── /volume1/test/b/bfile1.txt
[    263 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   ├── /volume1/test/b/bfile2-torename.txt
[    264 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   ├── /volume1/test/b/bfile3-todelete.txt
[    265 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   └── /volume1/test/b/bfile4-tochange.txt
[    257 -rw-r--r-- raiseru     6 2025-01-11--14-53-24]  ├── /volume1/test/file1.txt
[    258 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  ├── /volume1/test/file2-torename.txt
[    259 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  ├── /volume1/test/file3-todelete.txt
[    260 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  └── /volume1/test/file4-tochange.txt

3 directories, 16 files
OUT

echo "file5" > /volume1/test/file5-added.txt
mv /volume1/test/file2-torename.txt /volume1/test/file2-torename2.txt
rm /volume1/test/file3-todelete.txt
echo "\nfile4-newline" >> /volume1/test/file4-tochange.txt
sudo btrfs subvolume snapshot /volume1/test /volume1/test/#snapshots-snap2
tree -L 4 /volume1/test -f -p -gs -F -D --timefmt "%Y-%m-%d--%H-%M-%S" --inodes -h --metafirst | tee file2.tree
<<OUT
[    256 drwxr-xr-x raiseru   188 2025-01-11--14-56-37]  /volume1/test/
[    256 drwxr-xr-x raiseru   128 2025-01-11--14-53-25]  ├── /volume1/test/#snapshots-snap1/
[    261 drwxr-xr-x raiseru   134 2025-01-11--14-53-25]  │   ├── /volume1/test/#snapshots-snap1/b/
[    262 -rw-r--r-- raiseru     8 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap1/b/bfile1.txt
[    263 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap1/b/bfile2-torename.txt
[    264 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap1/b/bfile3-todelete.txt
[    265 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   └── /volume1/test/#snapshots-snap1/b/bfile4-tochange.txt
[    257 -rw-r--r-- raiseru     6 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap1/file1.txt
[    258 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap1/file2-torename.txt
[    259 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap1/file3-todelete.txt
[    260 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   └── /volume1/test/#snapshots-snap1/file4-tochange.txt
[    256 drwxr-xr-x raiseru   156 2025-01-11--14-56-37]  ├── /volume1/test/#snapshots-snap2/
[      2 drwxr-xr-x root        0 2025-01-11--14-56-37]  │   ├── /volume1/test/#snapshots-snap2/#snapshots-snap1/
[    261 drwxr-xr-x raiseru   134 2025-01-11--14-53-25]  │   ├── /volume1/test/#snapshots-snap2/b/
[    262 -rw-r--r-- raiseru     8 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap2/b/bfile1.txt
[    263 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap2/b/bfile2-torename.txt
[    264 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   ├── /volume1/test/#snapshots-snap2/b/bfile3-todelete.txt
[    265 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   │   └── /volume1/test/#snapshots-snap2/b/bfile4-tochange.txt
[    257 -rw-r--r-- raiseru     6 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap2/file1.txt
[    258 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  │   ├── /volume1/test/#snapshots-snap2/file2-torename2.txt
[    260 -rw-r--r-- raiseru    31 2025-01-11--14-56-37]  │   ├── /volume1/test/#snapshots-snap2/file4-tochange.txt
[    266 -rw-r--r-- raiseru     6 2025-01-11--14-56-37]  │   └── /volume1/test/#snapshots-snap2/file5-added.txt
[    261 drwxr-xr-x raiseru   134 2025-01-11--14-53-25]  ├── /volume1/test/b/
[    262 -rw-r--r-- raiseru     8 2025-01-11--14-53-25]  │   ├── /volume1/test/b/bfile1.txt
[    263 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   ├── /volume1/test/b/bfile2-torename.txt
[    264 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   ├── /volume1/test/b/bfile3-todelete.txt
[    265 -rw-r--r-- raiseru    17 2025-01-11--14-53-25]  │   └── /volume1/test/b/bfile4-tochange.txt
[    257 -rw-r--r-- raiseru     6 2025-01-11--14-53-24]  ├── /volume1/test/file1.txt
[    258 -rw-r--r-- raiseru    15 2025-01-11--14-53-24]  ├── /volume1/test/file2-torename2.txt
[    260 -rw-r--r-- raiseru    31 2025-01-11--14-56-37]  ├── /volume1/test/file4-tochange.txt
[    266 -rw-r--r-- raiseru     6 2025-01-11--14-56-37]  └── /volume1/test/file5-added.txt

6 directories, 24 files
OUT
```

### BTRFS SEND DUMP

Btrfs send needs readonly volumes

```shell
btrfs property set -f -ts "/volume1/test/#snapshots-snap1" ro true
btrfs property set -f -ts "/volume1/test/#snapshots-snap2" ro true
```

```shell
sudo btrfs send -p /volume1/test/#snapshots-snap1 /volume1/test/#snapshots-snap2| btrfs receive --dump
<< 'OUT'
At subvol /volume1/test/#snapshots-snap2
snapshot        ./#snapshots-snap2              uuid=10a29656-5a02-5a4d-9ac5-82a1a7e750aa transid=13 parent_uuid=dcf97a69-908c-1745-978b-2de857cb287d parent_transid=13
utimes          ./#snapshots-snap2/             atime=2025-01-11T14:56:37+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
link            ./#snapshots-snap2/file2-torename2.txt dest=file2-torename.txt
unlink          ./#snapshots-snap2/file2-torename.txt
utimes          ./#snapshots-snap2/             atime=2025-01-11T14:56:37+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
utimes          ./#snapshots-snap2/             atime=2025-01-11T14:56:37+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
utimes          ./#snapshots-snap2/file2-torename2.txt atime=2025-01-11T14:53:24+0200 mtime=2025-01-11T14:53:24+0200 ctime=2025-01-11T14:56:37+0200
unlink          ./#snapshots-snap2/file3-todelete.txt
utimes          ./#snapshots-snap2/             atime=2025-01-11T14:56:37+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
write           ./#snapshots-snap2/file4-tochange.txt offset=0 len=31
utimes          ./#snapshots-snap2/file4-tochange.txt atime=2025-01-11T14:58:16+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
mkfile          ./#snapshots-snap2/o266-11-0
rename          ./#snapshots-snap2/o266-11-0    dest=./#snapshots-snap2/file5-added.txt
utimes          ./#snapshots-snap2/             atime=2025-01-11T14:56:37+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
write           ./#snapshots-snap2/file5-added.txt offset=0 len=6
chown           ./#snapshots-snap2/file5-added.txt gid=1000 uid=1000
chmod           ./#snapshots-snap2/file5-added.txt mode=644
utimes          ./#snapshots-snap2/file5-added.txt atime=2025-01-11T14:56:37+0200 mtime=2025-01-11T14:56:37+0200 ctime=2025-01-11T14:56:37+0200
OUT
```

### BTRFS SEND SH DIFF

Script at https://github.com/mbideau/btrfs-diff-sh

```shell
echo Install script
wget "https://raw.githubusercontent.com/mbideau/btrfs-diff-sh/main/btrfs_diff.sh" bd.sh
chmod +x bd.sh
sudo ./bd.sh /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<<OUT
  added: /file2-torename2.txt
  added: /file5-added.txt
changed: /file4-tochange.txt
deleted: /file2-torename.txt
deleted: /file3-todelete.txt
OUT
```

### BTRFS DENO DIFF

sudo btrfs send -p /volume1/test/#snapshots-snap1 /volume1/test/#snapshots-snap2| btrfs receive --dump

```shell
sudo /home/raiseru/.deno/bin/deno --allow-read --allow-run --unstable-temporal bd.ts /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
# sudo /home/raiseru/.deno/bin/deno --allow-read --allow-run bd.ts /mnt/btrfs-temp/subvol1 /mnt/btrfs-temp/subvol1
```

### BTRFS PY DIFF

Source: https://github.com/sysnux/btrfs-snapshots-diff
Script 'bd.py' from https://github.com/sysnux/btrfs-snapshots-diff/blob/master/btrfs-snapshots-diff.py

```shell
sudo python3 bd.py -p /volume1/test/#snapshots-snap1/ -c /volume1/test/#snapshots-snap2/ --csv|sed "s/;/,/g"
<<OUT
snapshot,clone_ctransid=13,clone_uuid=dcf97a69908c1745978b2de857cb287d,ctransid=13,path=#snapshots-snap2,uuid=10a296565a025a4d9ac582a1a7e750aa
utimes,atime=1736600197.0547864,ctime=1736600197.0347865,mtime=1736600197.0347865,path=
link,path=file2-torename2.txt,path_link=file2-torename.txt
unlink,path=file2-torename.txt
utimes,atime=1736600197.0547864,ctime=1736600197.0347865,mtime=1736600197.0347865,path=
utimes,atime=1736600197.0547864,ctime=1736600197.0347865,mtime=1736600197.0347865,path=
utimes,atime=1736600004.9947915,ctime=1736600197.0347865,mtime=1736600004.9947915,path=file2-torename2.txt
unlink,path=file3-todelete.txt
utimes,atime=1736600197.0547864,ctime=1736600197.0347865,mtime=1736600197.0347865,path=
update_extent,file_offset=0,path=file4-tochange.txt,size=31
utimes,atime=1736600296.254791,ctime=1736600197.0347865,mtime=1736600197.0347865,path=file4-tochange.txt
mkfile,path=o266-11-0
rename,path=o266-11-0,path_to=file5-added.txt
utimes,atime=1736600197.0547864,ctime=1736600197.0347865,mtime=1736600197.0347865,path=
update_extent,file_offset=0,path=file5-added.txt,size=6
chown,group_id=1000,path=file5-added.txt,user_id=1000
chmod,mode=420,path=file5-added.txt
utimes,atime=1736600197.0247865,ctime=1736600197.0247865,mtime=1736600197.0247865,path=file5-added.txt
end,headers_length=1068,stream_length=1068
OUT
```

```shell
sudo python3 bd.py -p /volume1/test/#snapshots-snap1/ -c /volume1/test/#snapshots-snap2/ --json|sed "s/{/\n{/g"
```

```json
[
{"command": "snapshot", "path": "#snapshots-snap2", "uuid": "10a296565a025a4d9ac582a1a7e750aa", "ctransid": 13, "clone_uuid": "dcf97a69908c1745978b2de857cb287d", "clone_ctransid": 13},
{"command": "utimes", "path": "", "atime": 1736600197.0547864, "mtime": 1736600197.0347865, "ctime": 1736600197.0347865},
{"command": "link", "path": "file2-torename2.txt", "path_link": "file2-torename.txt"},
{"command": "unlink", "path": "file2-torename.txt"},
{"command": "utimes", "path": "", "atime": 1736600197.0547864, "mtime": 1736600197.0347865, "ctime": 1736600197.0347865},
{"command": "utimes", "path": "", "atime": 1736600197.0547864, "mtime": 1736600197.0347865, "ctime": 1736600197.0347865},
{"command": "utimes", "path": "file2-torename2.txt", "atime": 1736600004.9947915, "mtime": 1736600004.9947915, "ctime": 1736600197.0347865},
{"command": "unlink", "path": "file3-todelete.txt"},
{"command": "utimes", "path": "", "atime": 1736600197.0547864, "mtime": 1736600197.0347865, "ctime": 1736600197.0347865},
{"command": "update_extent", "path": "file4-tochange.txt", "file_offset": 0, "size": 31},
{"command": "utimes", "path": "file4-tochange.txt", "atime": 1736600296.254791, "mtime": 1736600197.0347865, "ctime": 1736600197.0347865},
{"command": "mkfile", "path": "o266-11-0"},
{"command": "rename", "path": "o266-11-0", "path_to": "file5-added.txt"},
{"command": "utimes", "path": "", "atime": 1736600197.0547864, "mtime": 1736600197.0347865, "ctime": 1736600197.0347865},
{"command": "update_extent", "path": "file5-added.txt", "file_offset": 0, "size": 6},
{"command": "chown", "path": "file5-added.txt", "user_id": 1000, "group_id": 1000},
{"command": "chmod", "path": "file5-added.txt", "mode": 420},
{"command": "utimes", "path": "file5-added.txt", "atime": 1736600197.0247865, "mtime": 1736600197.0247865, "ctime": 1736600197.0247865},
{"command": "end", "headers_length": 1068, "stream_length": 1068}]
```

````shell
btrfs send -p /mnt/btrfs-temp/subvol1 /mnt/btrfs-temp/subvol1 >a.dump
python3 bd.py --file=a.dump --json
<<OUT
[{"command": "snapshot", "path": "subvol1", "uuid": "a667a889f7f3424c89cf41a7b7a929d9", "ctransid": 10, "clone_uuid": "a667a889f7f3424c89cf41a7b7a929d9", "clone_ctransid": 10}, {"command": "end", "headers_length": 112, "stream_length": 112}]
OUT
python3 bd.py --file=a.dump --by_path --bogus
<<OUT
Found a valid Btrfs stream header, version 1
subvol1
        snapshot: uuid=a667a889f7f3424c89cf41a7b7a929d9, ctransid=10, clone_uuid=a667a889f7f3424c89cf41a7b7a929d9, clone_ctransid=10

Dump 
OUT

sudo btrfs send -p /volume1/testsrc/#snapshots-snap1 /volume1/testsrc/#snapshots-snap2 > c.dump
sudo python3 bd.py --file=c.dump -b --csv
<<OUT
snapshot;clone_ctransid=7065512;clone_uuid=e06b51934558ad498f02662c8d827341;ctransid=7065600;path=#snapshots-snap2;uuid=2eac4ccd48a45545a8878febc8894584
utimes;atime=1736332173.1468213;ctime=1736332166.1887264;mtime=1736332166.1887264;path=
link;path=file2-torename2.txt;path_link=file2-torename.txt
unlink;path=file2-torename.txt
utimes;atime=1736332173.1468213;ctime=1736332166.1887264;mtime=1736332166.1887264;path=
utimes;atime=1736332173.1468213;ctime=1736332166.1887264;mtime=1736332166.1887264;path=
utimes;atime=1736328945.6687818;ctime=1736332166.1827264;mtime=1736328945.6687818;path=file2-torename2.txt
unlink;path=file3-todelete.txt
utimes;atime=1736332173.1468213;ctime=1736332166.1887264;mtime=1736332166.1887264;path=
write;data=(102, 105, 108, 101, 52, 45, 116, 111, 99, 104, 97, 110, 103, 101, 10, 92, 110, 102, 105, 108, 101, 52, 45, 110, 101, 119, 108, 105, 110, 101, 10);file_offset=0;path=file4-tochange.txt
utimes;atime=1736328945.700782;ctime=1736332166.2007265;mtime=1736332166.2007265;path=file4-tochange.txt
mkfile;path=o266-7065599-0
chown;group_id=100;path=o266-7065599-0;user_id=1026
renamed_from;path=o266-7065599-0;path_to=file5-added.txt
rename;path=o266-7065599-0;path_to=file5-added.txt
utimes;atime=1736332173.1468213;ctime=1736332166.1887264;mtime=1736332166.1887264;path=
write;data=(102, 105, 108, 101, 53, 10);file_offset=0;path=file5-added.txt
chmod;mode=384;path=file5-added.txt
utimes;atime=1736332166.0997252;ctime=1736332166.0997252;mtime=1736332166.0997252;path=file5-added.txt
end;headers_length=1098;stream_length=1098
OUT
````

### BTRFS GO DIFF - bucko909

Source: https://github.com/bucko909/btrfs-send-go
Scripts: https://github.com/bucko909/btrfs-send-go/blob/master/test.go

```shell
sudo apt install golang-go libbtrfs-dev
wget https://raw.githubusercontent.com/bucko909/btrfs-send-go/refs/heads/master/test.go -O bd.go
sudo go run bd.go /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<<OUT
root_id 256
Cmd [15 0 16 0 35 115 110 97 112 115 104 111 116 115 45 115 110 97 112 50 1 0 16 0 16 162 150 86 90 2 90 77 154 197 130 161 167 231 80 170 2 0 8 0 13 0 0 0 0 0 0 0 20 0 16 0 220 249 122 105 144 140 23 69 151 139 45 232 87 203 40 125 21 0 8 0 13 0 0 0 0 0 0 0]; type 2
Cmd [15 0 0 0 11 0 12 0 133 106 130 103 0 0 0 0 74 249 67 3 10 0 12 0 133 106 130 103 0 0 0 0 72 204 18 2 9 0 12 0 133 106 130 103 0 0 0 0 72 204 18 2]; type 20
TRACE       BTRFS_SEND_C_UTIMES
TRACE    changed
...
TRACE    changed file5-added.txt
Cmd [15 0 15 0 102 105 108 101 53 45 97 100 100 101 100 46 116 120 116 11 0 12 0 133 106 130 103 0 0 0 0 199 53 122 1 10 0 12 0 133 106 130 103 0 0 0 0 199 53 122 1 9 0 12 0 133 106 130 103 0 0 0 0 199 53 122 1]; type 20
TRACE       BTRFS_SEND_C_UTIMES file5-added.txt
TRACE    changed file5-added.txt
Cmd []; type 21
END
new: map[:(map[file2-torename2.txt:(map[], added, file2-torename2.txt) file4-tochange.txt:(map[], changed, file4-tochange.txt) file5-added.txt:(map[], added, file5-added.txt)], changed, ) /file2-torename2.txt:(map[], added, file2-torename2.txt) /file4-tochange.txt:(map[], changed, file4-tochange.txt) /file5-added.txt:(map[], added, file5-added.txt)]
(map[file2-torename2.txt:(map[], added, file2-torename2.txt) file4-tochange.txt:(map[], changed, file4-tochange.txt) file5-added.txt:(map[], added, file5-added.txt)], changed, )
old: map[:(map[file2-torename.txt:(map[], deleted, file2-torename.txt) file3-todelete.txt:(map[], deleted, file3-todelete.txt) file4-tochange.txt:(map[], !!!, file4-tochange.txt)], !!!, ) /file2-torename.txt:(map[], deleted, file2-torename.txt) /file3-todelete.txt:(map[], deleted, file3-todelete.txt) /file4-tochange.txt:(map[], !!!, file4-tochange.txt)]
(map[file2-torename.txt:(map[], deleted, file2-torename.txt) file3-todelete.txt:(map[], deleted, file3-todelete.txt) file4-tochange.txt:(map[], !!!, file4-tochange.txt)], !!!, )
TRACE GENERATED
TRACE    deleted: /file3-todelete.txt
TRACE    changed: /file4-tochange.txt
TRACE    deleted: /file2-torename.txt
TRACE      added: /file2-torename2.txt
TRACE      added: /file5-added.txt
OUT
```

### BTRFS GO DIFF - mbideau (upgrade on bucko909)

Source: https://github.com/mbideau/btrfs-diff-go/
Script: https://github.com/bucko909/btrfs-send-go/blob/master/test.go

Author words
> Raw, and have minor bugs, but does exactly the job.
> I have improved it in my own fork, but it seems to crash on clone instructions.
> Also, having a compiled binary, is not super hackable (even a tiny one like this) and at deployment time, it might miss some dependencies (I have managed to build it statically but it doesn't work in my initram, I have not found out why).
> Finally it was not translatable (as-is).

```shell
git clone https://github.com/mbideau/btrfs-diff-go
(cd btrfs-diff-go/; sudo go run main.go /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/)
<<OUT
  added: /file2-torename2.txt
  added: /file5-added.txt
changed: /file4-tochange.txt
deleted: /file2-torename.txt
deleted: /file3-todelete.txt
exit status 1
OUT
```

### NO-BTRFS DIFF

The methods that are ignoring the btrfs are not performant but are good usage examples

```shell
diff -rqc /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<< 'OUT'
Only in /volume1/test/#snapshots-snap2/: #snapshots-snap1
Only in /volume1/test/#snapshots-snap1/: file2-torename.txt
Only in /volume1/test/#snapshots-snap2/: file2-torename2.txt
Only in /volume1/test/#snapshots-snap1/: file3-todelete.txt
Files /volume1/test/#snapshots-snap1/file4-tochange.txt and /volume1/test/#snapshots-snap2/file4-tochange.txt differ
Only in /volume1/test/#snapshots-snap2/: file5-added.txt
OUT

diff -ra /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<< 'OUT'
Only in /volume1/test/#snapshots-snap2/: #snapshots-snap1
Only in /volume1/test/#snapshots-snap1/: file2-torename.txt
Only in /volume1/test/#snapshots-snap2/: file2-torename2.txt
Only in /volume1/test/#snapshots-snap1/: file3-todelete.txt
diff -r -c -a /volume1/test/#snapshots-snap1/file4-tochange.txt /volume1/test/#snapshots-snap2/file4-tochange.txt
*** /volume1/test/#snapshots-snap1/file4-tochange.txt   2025-01-11 14:53:24.994791480 +0200
--- /volume1/test/#snapshots-snap2/file4-tochange.txt   2025-01-11 14:56:37.034786376 +0200
***************
*** 1 ****
--- 1,2 ----
  file4-tochange
+ \nfile4-newline
Only in /volume1/test/#snapshots-snap2/: file5-added.txt
OUT
```

```shell
# sudo apt install bat
diff -Nur /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/|batcat -l diff
diff -Nur /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<<OUT
diff -Nur /volume1/test/#snapshots-snap1/file2-torename.txt /volume1/test/#snapshots-snap2/file2-torename.txt
--- /volume1/test/#snapshots-snap1/file2-torename.txt   2025-01-11 14:53:24.994791480 +0200
+++ /volume1/test/#snapshots-snap2/file2-torename.txt   1970-01-01 02:00:00.000000000 +0200
@@ -1 +0,0 @@
-file2-torename
diff -Nur /volume1/test/#snapshots-snap1/file2-torename2.txt /volume1/test/#snapshots-snap2/file2-torename2.txt
--- /volume1/test/#snapshots-snap1/file2-torename2.txt  1970-01-01 02:00:00.000000000 +0200
+++ /volume1/test/#snapshots-snap2/file2-torename2.txt  2025-01-11 14:53:24.994791480 +0200
@@ -0,0 +1 @@
+file2-torename
diff -Nur /volume1/test/#snapshots-snap1/file3-todelete.txt /volume1/test/#snapshots-snap2/file3-todelete.txt
--- /volume1/test/#snapshots-snap1/file3-todelete.txt   2025-01-11 14:53:24.994791480 +0200
+++ /volume1/test/#snapshots-snap2/file3-todelete.txt   1970-01-01 02:00:00.000000000 +0200
@@ -1 +0,0 @@
-file3-todelete
diff -Nur /volume1/test/#snapshots-snap1/file4-tochange.txt /volume1/test/#snapshots-snap2/file4-tochange.txt
--- /volume1/test/#snapshots-snap1/file4-tochange.txt   2025-01-11 14:53:24.994791480 +0200
+++ /volume1/test/#snapshots-snap2/file4-tochange.txt   2025-01-11 14:56:37.034786376 +0200
@@ -1 +1,2 @@
 file4-tochange
+\nfile4-newline
diff -Nur /volume1/test/#snapshots-snap1/file5-added.txt /volume1/test/#snapshots-snap2/file5-added.txt
--- /volume1/test/#snapshots-snap1/file5-added.txt      1970-01-01 02:00:00.000000000 +0200
+++ /volume1/test/#snapshots-snap2/file5-added.txt      2025-01-11 14:56:37.024786375 +0200
@@ -0,0 +1 @@
+file5
OUT
```

### NO-BTRFS GIT DIFF

```shell
git diff --no-index /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<<OUT
diff --git a/volume1/test/#snapshots-snap1/file2-torename.txt b/volume1/test/#snapshots-snap2/file2-torename2.txt
similarity index 100%
rename from /volume1/test/#snapshots-snap1/file2-torename.txt
rename to /volume1/test/#snapshots-snap2/file2-torename2.txt
diff --git a/volume1/test/#snapshots-snap1/file3-todelete.txt b/volume1/test/#snapshots-snap1/file3-todelete.txt
deleted file mode 100644
index e756713..0000000
--- a/volume1/test/#snapshots-snap1/file3-todelete.txt
+++ /dev/null
@@ -1 +0,0 @@
-file3-todelete
diff --git a/volume1/test/#snapshots-snap1/file4-tochange.txt b/volume1/test/#snapshots-snap2/file4-tochange.txt
index 023071b..d451830 100644
--- a/volume1/test/#snapshots-snap1/file4-tochange.txt
+++ b/volume1/test/#snapshots-snap2/file4-tochange.txt
@@ -1 +1,2 @@
 file4-tochange
+\nfile4-newline
diff --git a/volume1/test/#snapshots-snap2/file5-added.txt b/volume1/test/#snapshots-snap2/file5-added.txt
new file mode 100644
index 0000000..4806cb9
--- /dev/null
+++ b/volume1/test/#snapshots-snap2/file5-added.txt
@@ -0,0 +1 @@
+file5
OUT
```

### NO-BTRFS RSYNC

- (!) rsync doesn't properly handling renames. with fuzzy might, but be carefull to do deletions at the end
  - https://unix.stackexchange.com/questions/620070/is-it-true-that-rsync-does-not-handle-file-renames-gracefully
  - https://www.reddit.com/r/linux/comments/tja13i/rsyncsidekick_propagate_file_renames_movements/
  - https://www.reddit.com/r/linux/comments/tja13i/rsyncsidekick_propagate_file_renames_movements/
  - https://www.pkrc.net/detect-inode-moves.html
  - https://github.com/wapsi/smart-rsync-backup
  - https://lincolnloop.com/insights/detecting-file-moves-renames-rsync/ - how to do renames properly and with hardlinks

```shell
sudo rsync --dry-run -av --delete --delete-after --hard-links --fuzzy --partial --progress --size-only --itemize-changes --exclude "@eaDir" /volume1/test/#snapshots-snap1/ /volume1/test/#snapshots-snap2/
<<OUT
building file list ...
10 files to consider
.d..t...... ./
>f+++++++++ file2-torename.txt
>f+++++++++ file3-todelete.txt
>f.st...... file4-tochange.txt
*deleting   #snapshots-snap1/
*deleting   file5-added.txt
*deleting   file2-torename2.txt

sent 356 bytes  received 69 bytes  850.00 bytes/sec
total size is 110  speedup is 0.26 (DRY RUN)
OUT
```
tree /volume1/test/

### NO-BTRFS MTREE DIFF

```shell
VOL1=/volume1/test/#snapshots-snap1/  && VOL2=/volume1/test/#snapshots-snap2/ && mtree -c -p $VOL1>dir1.mtree && mtree -c -p $VOL2 > dir2.mtree && diff dir1.mtree dir2.mtree
<<OUT
3c3
< #        tree: /volume1/test/#snapshots-snap1
---
> #        tree: /volume1/test/#snapshots-snap2
8c8
< .               type=dir mode=0755 time=1736600005.4791480
---
> .               type=dir mode=0755 time=1736600197.34786376
10,12c10
<     file2-torename.txt \
<                 size=15 time=1736600004.994791480
<     file3-todelete.txt \
---
>     file2-torename2.txt \
15c13,22
<                 size=15 time=1736600004.994791480
---
>                 size=31 time=1736600197.34786376
>     file5-added.txt \
>                 size=6 time=1736600197.24786375
>
> # ./#snapshots-snap1
> \#snapshots-snap1 \
>                 type=dir uid=0 gid=0 mode=0755 time=1736607611.564792014
> # ./#snapshots-snap1
> ..
>
OUT

cat dir1.mtree
<<OUT
raiseru@AMANTAWIN3:/mnt/d/home/raiser/work/2025-01-08--btrfs-diff$ cat dir1.mtree
#          user: (null)
#       machine: AMANTAWIN3
#          tree: /volume1/test/#snapshots-snap1
#          date: Sat Jan 11 17:00:11 2025

# .
/set type=file uid=1000 gid=1000 mode=0644 nlink=1 flags=none
.               type=dir mode=0755 time=1736600005.4791480
    file1.txt   size=6 time=1736600004.994791480
    file2-torename.txt \
                size=15 time=1736600004.994791480
    file3-todelete.txt \
                size=15 time=1736600004.994791480
    file4-tochange.txt \
                size=15 time=1736600004.994791480

# ./b
b               type=dir mode=0755 time=1736600005.4791480
    bfile1.txt  size=8 time=1736600005.4791480
    bfile2-torename.txt \
                size=17 time=1736600005.4791480
    bfile3-todelete.txt \
                size=17 time=1736600005.4791480
    bfile4-tochange.txt \
                size=17 time=1736600005.4791480
# ./b
..
OUT
```
