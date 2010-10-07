// --------------------------------------------------------------------------
// "THE BEER-WARE LICENSE" (Revision 42):
// pcapr wrote this file. As long as you retain this notice you can do whatever
// you want with this stuff. If we meet some day, and you think this stuff is 
// worth it, you can buy us a beer in return. 
//
// http://www.pcapr.net
// http://twitter.com/pcapr
// http://labs.mudynamics.com
// --------------------------------------------------------------------------
var Fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Sys = require('sys');

function IGlob(opts) {
    var self = this;
    var filesInQ = [];
    
    // The filter can either be a function or a regex
    function matches(name) {
        if (opts.filter instanceof RegExp) {
            return opts.filter.test(name);
        } else if (typeof opts.filter === 'function') {
            return opts.filter(file);
        }
        return true;
    }

    // Scan each directory and add the results to filesInQ. We move files
    // in a directory to the front of the queue and the directories to
    // the back. This keeps the filesInQ from growing unbounded.
    function scanDirectory(dir) {
        Fs.readdir(dir, function(err, files) {
            if (err) {
                self.emit('error', err, dir);
                _scanNext();
                return; 
            }
            
            files.forEach(function(file) {
                var path = dir + file;
                try {
                    var stat = Fs.statSync(path);
                    if (stat.isDirectory()) {
                        filesInQ.push(path + '/');
                    } else if (stat.isFile()){
                        filesInQ.unshift(path);
                    }                    
                } catch(e) {
                    self.emit('error', e, file);
                }
            });                

            _scanNext();
        });
    }

    // Scan a single file
    function scanFile(file, stat) {
        if (matches(file)) {
            self.emit('file', { next: _scanNext }, file, stat);
        } else {
            _scanNext();
        }
    }
    
    // Schedule a scan as soon as possible
    function _scanNext() {
        process.nextTick(scanNext);
    }

    // Pull the next item from the filesInQ and process it
    function scanNext() {
        if (filesInQ.length === 0) {
            self.emit('end');
            
            // If an interval is provided, restart the scan all over again
            if (opts.interval > 0) {
                setTimeout(function() { scanDirectory(opts.dir); }, opts.interval * 1000);                
            }
            return;
        }
        
        var nextFile = filesInQ.shift();        
        var stat;
        try {
            stat = Fs.statSync(nextFile);
        } catch(err) {
            self.emit('error', err, nextFile);
            _scanNext();
            return;
        }
        
        if (stat.isFile()) {
            scanFile(nextFile, stat);
        } else if (stat.isDirectory()) {
            if (self.listeners('dir').length === 0) {
                scanDirectory(nextFile);
            } else {
                var next = function(recurse) {
                    recurse = recurse === undefined ? true : recurse;
                    if (recurse) {
                        scanDirectory(nextFile);
                    } else {
                        _scanNext();
                    }
                };
                self.emit('dir', { next: next }, nextFile, stat);
            }
        } else {
            _scanNext();
        }
    }
    
    opts = opts || {};
    opts.interval = opts.interval || 0;
    if (/\/$/.test(opts.dir) === false) { 
        opts.dir = opts.dir + '/'; 
    }
    
    scanDirectory(opts.dir);
    return self;
}

Sys.inherits(IGlob, EventEmitter);

// Simple usage:
//
// require('iglob')
//     .create({ dir: '/', filter: /\.txt$/ })
//     .on('file', function(iterator, file, stat) {
//         iterator.next();
//      });
exports.create = function(opts) {
    return new IGlob(opts);
};
