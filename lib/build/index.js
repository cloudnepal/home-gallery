const path = require('path');
const { pipeline } = require('stream');

const { readStreams } = require('../index/read-stream');

const processIndicator = require('../stream/process-indicator');
const filter = require('../stream/filter');
const mapToCatalogEntry = require('./map-catalog-entry');
const readMeta = require('../extract/read-meta');
const groupByDir = require('./group-by-dir');
const groupSidecarFiles = require('./group-sidecar-files');
const flatten = require('../stream/flatten');
const sort = require('../stream/sort');
const each = require('../stream/each');
const mapToMedia = require('./map-media');
const toList = require('../stream/to-list');
const writeCatalog = require('./write-catalog');

function build(indexFilenames, storageDir, catalogFilename, fileFilterFn, cb) {
  readStreams(indexFilenames, (err, entryStream) => {
    if (err) {
      return cb(err);
    }

    let totalFiles = 0;
    let result;
    pipeline(
      entryStream,
      filter(entry => entry.fileType === 'f' && entry.sha1sum && entry.size > 0),
      filter(entry => fileFilterFn(entry.filename)),
      // Sort by index and filename
      toList(),
      sort(entry => `${entry.indexName}:${entry.filename}`, true),
      each(entry => { totalFiles = entry.length }),
      flatten(),
      mapToCatalogEntry,
      // Read all meta data
      readMeta(storageDir),
      processIndicator({name: 'read meta', totalFn: () => totalFiles}),
      // Stream entry list
      toList(),
      sort(entry => path.dirname(entry.filename)),
      flatten(),
      groupByDir,
      processIndicator({name: 'read directories'}),
      groupSidecarFiles,
      // Stream single entry
      flatten(),
      filter(entry => ['image', 'rawImage', 'video', 'sound'].indexOf(entry.type) >= 0),
      mapToMedia,
      processIndicator({name: 'map to media'}),
      toList(),
      sort(entry => entry.date, true),
      each(entry => { result = entry }),
      (err) => {
        if (err) {
          debug(`Could not build database: ${err}`);
          return cb(err);
        }
        if (!result) {
          return cb(null, null);
        }
        writeCatalog(catalogFilename, result, (err, catalog) => {
          if (err) {
            return cb(err);
          }
          cb(null, catalog);
        });
      }
    );
  })
}

module.exports = build;