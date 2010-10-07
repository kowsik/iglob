# Incremental file globber/scanner

Incrementally scans the specified directory emitting events along the way.
You can specify the `dir` that's scanned, optional `filter` if any for the
filename and an `interval` if you want repeated scans.

# Usage

    require('iglob');
    
    IGlob.create({
        dir: '/tmp',
        filter: /\.txt$/
    }).on('file', function(iterator, file, stat) {
        console.log('found file: ' + file);
        iterator.next();
    }).on('dir', function(iterator, dir, stat) {
        console.log('found dir: ' + dir);
        iterator(true);
    });
    
# Options
These are the options for *IGlob* when you create a scanner. The only required
thing is the dir.

<table>
    <tr>
        <td><strong>dir</strong></td>
        <td>The root directory to scan</td>
    </tr>
    <tr>
        <td>filter</td>
        <td>Optional filename filter (RegExp or a function)</td>
    </tr>
    <tr>
        <td>interval</td>
        <td>Optional to repeat the scan after this many `ms`</td>
    </tr>
</table>

# Events
As the scanner finds files and directories, it emits various events that
you can listen for.

## file
This event is invoked for each file found under the scanned directory. The
event listener is invoked with an `iterator`, the `filename` and the `stat`.
You can have the scanner resume scanning by invoking `iterator.next()`.

    IGlob.create({ 
        dir: '/tmp' 
    }).on('file', function(iterator, file, stat) {
        // Some asynchronous time consuming file processing...
        iterator.next();
    });
    
## dir
This event is invoked for each directory found under the scanned directory.
The event listener is invoked with an `iterator`, the `dirname` and the `stat`.
You can have the scanner resume scanning by invoking `iterator.next()`. The
`next` method for the dir events takes a boolean that indicates if the scanner
should recurse into this directory or not.

    IGlob.create({
        dir: '/usr/local'
    }).on('dir', function(iterator, dir, stat) {
        // Skip hidden directories
        iterator.next(/^\./.test(dir) === false);
    });
    
## error
This event is invoked for each file or directory for which `fs.stat` fails.
The event listener is invoked with the exception as well as the file or
directory name that had the error.