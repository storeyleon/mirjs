const fs = require('fs');
const zlib = require('zlib');
const Jimp = require('Jimp');
const sharp = require('sharp');
const compress_images = require('compress-images');

const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');

function BmpEncoder(imgData){
	this.buffer = imgData.data;
	this.width = imgData.width;
	this.height = imgData.height;
	this.extraBytes = this.width%4;
	this.rgbSize = this.height*(3*this.width+this.extraBytes);
	this.headerInfoSize = 40;

	this.data = [];
	/******************header***********************/
	this.flag = "BM";
	this.reserved = 0;
	this.offset = 54;
	this.fileSize = this.rgbSize+this.offset;
	this.planes = 1;
	this.bitPP = 24;
	this.compress = 0;
	this.hr = 0;
	this.vr = 0;
	this.colors = 0;
	this.importantColors = 0;
}

BmpEncoder.prototype.encode = function() {
	var tempBuffer = new Buffer.alloc(this.offset+this.rgbSize);
	this.pos = 0;
	tempBuffer.write(this.flag,this.pos,2);this.pos+=2;
	tempBuffer.writeUInt32LE(this.fileSize,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.reserved,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.offset,this.pos);this.pos+=4;

	tempBuffer.writeUInt32LE(this.headerInfoSize,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.width,this.pos);this.pos+=4;
	tempBuffer.writeInt32LE(-this.height,this.pos);this.pos+=4;
	tempBuffer.writeUInt16LE(this.planes,this.pos);this.pos+=2;
	tempBuffer.writeUInt16LE(this.bitPP,this.pos);this.pos+=2;
	tempBuffer.writeUInt32LE(this.compress,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.rgbSize,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.hr,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.vr,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.colors,this.pos);this.pos+=4;
	tempBuffer.writeUInt32LE(this.importantColors,this.pos);this.pos+=4;

	var i=0;
	var rowBytes = 3*this.width+this.extraBytes;

	for (var y = 0; y <this.height; y++){
		for (var x = 0; x < this.width; x++){
			var p = this.pos+y*rowBytes+x*3;
			//i++;//a
			tempBuffer[p]= this.buffer[i++];//b
			tempBuffer[p+1] = this.buffer[i++];//g
            tempBuffer[p+2]  = this.buffer[i++];//r
            i++
		}
		if(this.extraBytes>0){
			var fillOffset = this.pos+y*rowBytes+this.width*3;
			tempBuffer.fill(0,fillOffset,fillOffset+this.extraBytes);
		}
	}

	return tempBuffer;
};

var bmpEncode = function(imgData, quality) {
  if (typeof quality === 'undefined') quality = 100;
 	var encoder = new BmpEncoder(imgData);
	var data = encoder.encode();
  return {
    data: data,
    width: imgData.width,
    height: imgData.height
  };
}












Buffer.prototype._readingOffset = 0;
Buffer.prototype.readInt32 = function() {
    var data = this.readInt32LE(this._readingOffset)
    this._readingOffset += 4
    return data
}
Buffer.prototype.readInt16 = function() {
    var data = this.readInt16LE(this._readingOffset)
    this._readingOffset += 2
    return data
}
Buffer.prototype.readByte = function() {
    var data = this.readInt8(this._readingOffset)
    this._readingOffset += 1
    return data
}
Buffer.prototype.readBytes = function(length) {
    var dataTmp = this.slice(this._readingOffset, this._readingOffset+length)
    this._readingOffset += length
    return dataTmp
}
Buffer.prototype.setReadingOffset = function(offset) {
    this._readingOffset = offset
}

var imageJson = {}
var loadImage = function(data, index, folder) {
    data.setReadingOffset(indexList[index])
    var width = data.readInt16()
    var height = data.readInt16()
    var x = data.readInt16()
    var y = data.readInt16()
    var shadowX = data.readInt16()
    var shadowY = data.readInt16()
    var shadow = data.readByte()
    var length = data.readInt32()
    var fBytes = data.readBytes(length)
    var hasMask = ((shadow >> 7) == 1) ? true : false
    console.log("Index = "+index+"\r\n"
                +"Width = "+width+"px\r\n"
                +"Height = "+height+"px\r\n"
                +"X = "+x+"\r\n"
                +"Y = "+y+"\r\n"
                +"Shadow X = "+shadowX+"px\r\n"
                +"Shadow Y = "+shadowY+"px\r\n"
                +"Shadow = "+shadow+"\r\n"
                +"Length = "+length+"\r\n"
                +"FBytes = "+fBytes.length+"\r\n"
                +"HasMask = "+hasMask+"\r\n")

    imageJson[index] = {width:width, height:height, x:x, y:y}

    var decomp = new Buffer.alloc(0);
    var decompressStream = zlib.createGunzip()
        .on('data', function (chunk) {
            decomp = Buffer.concat([decomp, chunk]);
        }).on('error', function(err) {
            console.log("err" +err)
        })
        
    decompressStream.write(fBytes, null, function() {
        //var bmpData = {data: decomp, width: width, height:height}
        //var rawData = bmpEncode(bmpData);
        var i = 0
        let image = new Jimp(width, height, function (err, image) {
            if (err) throw err;
          
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    var b = decomp[i++]
                    var g = decomp[i++]
                    var r = decomp[i++]
                    var a = decomp[i++]

                    image.setPixelColor(Jimp.rgbaToInt(r, g, b, a), x, y);
                };
            };
          
            image.filterType(4).deflateLevel(9).write(folder+'/'+index+'.png', (err) => {
              if (err) throw err;
            });
        });

        
        
        /*(async () => {
            const files = await imagemin(['*.{jpg,png}'], 'Test/', {
                plugins: [
                    imageminJpegtran(),
                    imageminPngquant({
                        quality: [0.6, 0.8]
                    })
                ]
            });
        
            console.log(files);
            //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
        })();*/

       // fs.writeFileSync("test"+index+".bmp", rawData.data)
        //console.log("Saved")
    })
}

var args = process.argv.slice(2);

var library = args[0]
var folder = library.toLowerCase()

if (!fs.existsSync(folder)){
    fs.mkdirSync(folder);
}

var data = fs.readFileSync(library+'.lib')

var libVersion = data.readInt32()
var libCount = data.readInt32()

console.log("Library Version: "+libVersion+", "+libCount)

var indexList = []
for(var i = 0; i < libCount; i++) {
    indexList.push(data.readInt32())
}

for(var i = 0; i < libCount; i++)
{
    loadImage(data, i, folder)
}

fs.writeFile("./"+folder+"/lib.json", JSON.stringify(imageJson), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
}); 