# XML Object Stream

## Basic usage

```javascript
const xos = new XMLObjectStream(fs.createReadStream('books-catalog.xml'), {emitElements:['book']});
xos.on('end', function () {
    // xml parsed
});
xos.on('error', (err) => {
    // handle error
});
xos.on('element', (elm) => {
    // do something with book element
});
xos.parse();
```