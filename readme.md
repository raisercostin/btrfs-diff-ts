# Btrfs Diff

## Deno Typescript Usage

> sudo deno --allow-read --allow-run --unstable-temporal bd.ts /volume1/testsrc/#snapshots-snap1/ /volume1/testsrc/#snapshots-snap2/
> sudo /home/raiseru/.deno/bin/deno --allow-read --allow-run --unstable-temporal bd.ts -f c.dump

## ToDo

- Reply here https://www.reddit.com/r/btrfs/comments/ky1d12/btrfs_snapshot_diff/

## Development

### Resources

The binary format created by `btrfs send` is here:
https://btrfs.readthedocs.io/en/latest/dev/dev-send-stream.html#attributes-tlv-types

### Existing implementations

#### Btrfs dump

```sh
> sudo btrfs send -p /volume1/testsrc/#snapshots-snap1 /volume1/testsrc/#snapshots-snap2| btrfs receive --dump
At subvol /volume1/testsrc/#snapshots-snap2
snapshot        ./#snapshots-snap2              uuid=2eac4ccd-48a4-5545-a887-8febc8894584 transid=7065600 parent_uuid=e06b5193-4558-ad49-8f02-662c8d827341 parent_transid=7065512
utimes          ./#snapshots-snap2/             atime=2025-01-08T12:29:33+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
link            ./#snapshots-snap2/file2-torename2.txt dest=file2-torename.txt
unlink          ./#snapshots-snap2/file2-torename.txt
utimes          ./#snapshots-snap2/             atime=2025-01-08T12:29:33+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
utimes          ./#snapshots-snap2/             atime=2025-01-08T12:29:33+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
utimes          ./#snapshots-snap2/file2-torename2.txt atime=2025-01-08T11:35:45+0200 mtime=2025-01-08T11:35:45+0200 ctime=2025-01-08T12:29:26+0200
unlink          ./#snapshots-snap2/file3-todelete.txt
utimes          ./#snapshots-snap2/             atime=2025-01-08T12:29:33+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
write           ./#snapshots-snap2/file4-tochange.txt offset=0 len=31
utimes          ./#snapshots-snap2/file4-tochange.txt atime=2025-01-08T11:35:45+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
mkfile          ./#snapshots-snap2/o266-7065599-0
chown           ./#snapshots-snap2/o266-7065599-0 gid=100 uid=1026
rename          ./#snapshots-snap2/o266-7065599-0 dest=./#snapshots-snap2/file5-added.txt
utimes          ./#snapshots-snap2/             atime=2025-01-08T12:29:33+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
write           ./#snapshots-snap2/file5-added.txt offset=0 len=6
chmod           ./#snapshots-snap2/file5-added.txt mode=600
utimes          ./#snapshots-snap2/file5-added.txt atime=2025-01-08T12:29:26+0200 mtime=2025-01-08T12:29:26+0200 ctime=2025-01-08T12:29:26+0200
```

#### Python Script Usage

https://github.com/sysnux/btrfs-snapshots-diff

Script from https://github.com/sysnux/btrfs-snapshots-diff/blob/master/btrfs-snapshots-diff.py

> btrfs send -p /mnt/btrfs-temp/subvol1 /mnt/btrfs-temp/subvol1 >a.dump
> python3 bd.py --file=a.dump --json
[{"command": "snapshot", "path": "subvol1", "uuid": "a667a889f7f3424c89cf41a7b7a929d9", "ctransid": 10, "clone_uuid": "a667a889f7f3424c89cf41a7b7a929d9", "clone_ctransid": 10}, {"command": "end", "headers_length": 112, "stream_length": 112}]

> python3 bd.py --file=a.dump --by_path --bogus
Found a valid Btrfs stream header, version 1
subvol1
        snapshot: uuid=a667a889f7f3424c89cf41a7b7a929d9, ctransid=10, clone_uuid=a667a889f7f3424c89cf41a7b7a929d9, clone_ctransid=10

Dump 
> sudo btrfs send -p /volume1/testsrc/#snapshots-snap1 /volume1/testsrc/#snapshots-snap2 > c.dump
> sudo python3 bd.py --file=c.dump -b --csv

```csv;
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
```

#### Go Script Usage
