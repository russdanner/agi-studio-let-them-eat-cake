/*
  Adventure Game Interpreter
  Original IBM PC version by Jeff Stephenson and Cris Iden
  of Sierra On-Line Inc. Around 1984-1989.
  
  JavaScript version by Erik Sandberg, 2014 (30th-ish anniversary!).
  This interpreter parses the original game resource files.
  I do not provide these files as they are the intellectual property of Sierra.
  
  This is not a straight port, but has been implemented from the specs
  defined by Lance Ewing, Peter Kelly, Claudio Matsuoka, Stu George and David Symonds
  at http://wiki.scummvm.org/index.php/AGI/Specifications
*/
var Agi;
(function (Agi) {
    Agi.palette = [
        0x000000,
        0x0000AA,
        0x00AA00,
        0x00AAAA,
        0xAA0000,
        0xAA00AA,
        0xAA5500,
        0xAAAAAA,
        0x555555,
        0x5555FF,
        0x55FF55,
        0x55FFFF,
        0xFF5555,
        0xFF55FF,
        0xFFFF55,
        0xFFFFFF
    ];
    function start(path, context) {
        Resources.load(path, () => {

            if(!Agi.interpreter) {
                Agi.interpreter = new Agi.Interpreter(context);
                Agi.interpreter.start();    
            }
            window.onkeypress = function (e) {
                // switch to window.addEventListener

                if (e.keyCode == 32) {
                    // block the default scroll behavior
                    e.preventDefault();
                }
                //if (e.which != 13) {
                // enter should be allowed to close a dialog
                Agi.interpreter.keyboardCharBuffer.push(e.which);
                Agi.interpreter.variables[19] = e.which
                //}
            };
            window.onkeydown = function (e) {
                if (e.keyCode == 40) {
                    // block the default scroll behavior
                    e.preventDefault();
                }
                Agi.interpreter.keyboardSpecialBuffer.push(e.which);
            };
            (function renderloop() {
                //window.requestAnimationFrame(renderloop);
                Agi.interpreter.cycle();
                // this is normally units of 1000 / 20 
                setTimeout(renderloop, (1000 / 15) * Agi.interpreter.variables[10]);
            })();
        });
    }
    Agi.start = start;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    /* May switch this to use the blitter */
    class Dialogue {
        constructor() {
            var dialogEl = document.getElementById("dialogue")
            this.mode = 1;
            this.outterEl = (dialogEl) ? dialogEl : document.createElement("div");
            this.outterEl.id = "dialogue"
            this.outterEl.innerHTML = ""

            this.innerEl = document.createElement("div");
            this.outterEl.appendChild(this.innerEl);
            document.body.appendChild(this.outterEl);
            this.outterEl.style.display = "none";
            this.outterEl.style.width = "auto";
            this.outterEl.style.top = "20%";
            this.outterEl.style.left = "25%";
            this.outterEl.style.position = "absolute";
            this.outterEl.style.backgroundColor = "white";
            this.outterEl.style.padding = "15px";
            this.outterEl.style.marginRight = "25%";
            this.outterEl.style.fontSize = "xx-large";
            this.innerEl.style.display = "block";
            this.innerEl.style.width = "auto";
            this.innerEl.style.height = "90%";
            this.innerEl.style.padding = "15px";
            this.innerEl.style.fontFamily = "system-ui";
            this.innerEl.style.fontWeight = "bolder";
            // this.innerEl.style.fontFamily = "agifont"
            this.innerEl.style.border = "solid 9px darkred";
        }
        open() {
            this.outterEl.style.display = "block";
        }
        close() {
            this.outterEl.style.display = "none";
        }
        setText(text) {
            this.innerEl.innerHTML = text;
        }
        setMode(mode) {
        }
    }
    Agi.Dialogue = Dialogue;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class Logic {
        constructor(no, data) {
            this.no = no;
            this.data = data;
            this.messages = [];
        }
    }
    Agi.Logic = Logic;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class Bitmap {
        constructor() {
            this.data = new Uint8Array(Bitmap.width * Bitmap.height);
        }
        clear(color) {
            for (var i = 0; i < Bitmap.width * Bitmap.height; i++) {
                this.data[i] = color;
            }
        }
    }
    Bitmap.width = 160;
    Bitmap.height = 168;
    Agi.Bitmap = Bitmap;
    let PicOpcode;
    (function (PicOpcode) {
        PicOpcode[PicOpcode["PicSetColor"] = 240] = "PicSetColor";
        PicOpcode[PicOpcode["PicDisable"] = 241] = "PicDisable";
        PicOpcode[PicOpcode["PriSetcolor"] = 242] = "PriSetcolor";
        PicOpcode[PicOpcode["PriDisable"] = 243] = "PriDisable";
        PicOpcode[PicOpcode["DrawYCorner"] = 244] = "DrawYCorner";
        PicOpcode[PicOpcode["DrawXCorner"] = 245] = "DrawXCorner";
        PicOpcode[PicOpcode["DrawAbs"] = 246] = "DrawAbs";
        PicOpcode[PicOpcode["DrawRel"] = 247] = "DrawRel";
        PicOpcode[PicOpcode["DrawFill"] = 248] = "DrawFill";
        PicOpcode[PicOpcode["SetPen"] = 249] = "SetPen";
        PicOpcode[PicOpcode["DrawPen"] = 250] = "DrawPen";
        PicOpcode[PicOpcode["End"] = 255] = "End";
    })(PicOpcode || (PicOpcode = {}));
    class Pic {
        constructor(stream) {
            this.stream = stream;
            this.picEnabled = false;
            this.priEnabled = false;
            this.picColor = 0;
            this.priColor = 0;
            this.penSize = 0;
            this.penSplatter = false;
            this.penRectangle = true;
            this.circles = [
                ["p"],
                ["xp"],
                [" x ", "xxx", "xpx", "xxx", " x "],
                [" xx ", " xx ", "xxxx", "xxpx", "xxxx", " xx ", " xx "],
                ["  x  ", " xxx ", "xxxxx", "xxxxx", "xxpxx", "xxxxx", "xxxxx", " xxx ", "  x  "],
                ["  xx  ", " xxxx ", " xxxx ", " xxxx ", "xxxxxx", "xxxpxx", "xxxxxx", " xxxx ", " xxxx ", " xxxx ", "  xx  "],
                ["  xxx  ", " xxxxx ", " xxxxx ", " xxxxx ", "xxxxxxx", "xxxxxxx", "xxxpxxx", "xxxxxxx", "xxxxxxx", " xxxxx ", " xxxxx ", " xxxxx ", "  xxx  "],
                ["   xx   ", "  xxxx  ", " xxxxxx ", " xxxxxx ", " xxxxxx ", "xxxxxxxx", "xxxxxxxx", "xxxxpxxx", "xxxxxxxx", "xxxxxxxx", " xxxxxx ", " xxxxxx ", " xxxxxx ", "  xxxx  ", "   xx   "]
            ];
        }
        setPixel(x, y, drawVis = true, drawPri = true) {
            if (this.picEnabled && drawVis)
                this.visible.data[y * Bitmap.width + x] = this.picColor;
            if (this.priEnabled && drawPri)
                this.priority.data[y * Bitmap.width + x] = this.priColor;
        }
        round(aNumber, dirn) {
            if (dirn < 0)
                return ((aNumber - Math.floor(aNumber) <= 0.501) ?
                    Math.floor(aNumber) : Math.ceil(aNumber));
            return ((aNumber - Math.floor(aNumber) < 0.499) ?
                Math.floor(aNumber) : Math.ceil(aNumber));
        }
        drawLine(x1, y1, x2, y2) {
            var x, y;
            var height = y2 - y1;
            var width = x2 - x1;
            var addX = (height == 0 ? height : width / Math.abs(height));
            var addY = (width == 0 ? width : height / Math.abs(width));
            if (Math.abs(width) > Math.abs(height)) {
                y = y1;
                addX = (width == 0 ? 0 : width / Math.abs(width));
                for (x = x1; x != x2; x += addX) {
                    this.setPixel(this.round(x, addX), this.round(y, addY));
                    y += addY;
                }
                this.setPixel(x2, y2);
            }
            else {
                x = x1;
                addY = (height == 0 ? 0 : height / Math.abs(height));
                for (y = y1; y != y2; y += addY) {
                    this.setPixel(this.round(x, addX), this.round(y, addY));
                    x += addX;
                }
                this.setPixel(x2, y2);
            }
        }
        opDrawXCorner() {
            var startX = this.stream.readUint8();
            var startY = this.stream.readUint8();
            this.setPixel(startX, startY);
            while (true) {
                var x2 = this.stream.readUint8();
                if (x2 >= 0xF0)
                    break;
                this.drawLine(startX, startY, x2, startY);
                startX = x2;
                var y2 = this.stream.readUint8();
                if (y2 >= 0xF0)
                    break;
                this.drawLine(startX, startY, startX, y2);
                startY = y2;
            }
            this.stream.position--;
        }
        opDrawYCorner() {
            var startX = this.stream.readUint8();
            var startY = this.stream.readUint8();
            this.setPixel(startX, startY);
            while (true) {
                var y2 = this.stream.readUint8();
                if (y2 >= 0xF0)
                    break;
                this.drawLine(startX, startY, startX, y2);
                startY = y2;
                var x2 = this.stream.readUint8();
                if (x2 >= 0xF0)
                    break;
                this.drawLine(startX, startY, x2, startY);
                startX = x2;
            }
            this.stream.position--;
        }
        opDrawAbs() {
            var startX = this.stream.readUint8();
            var startY = this.stream.readUint8();
            while (true) {
                var nextX = this.stream.readUint8();
                if (nextX >= 0xF0)
                    break;
                var nextY = this.stream.readUint8();
                this.drawLine(startX, startY, nextX, nextY);
                startX = nextX;
                startY = nextY;
            }
            this.stream.position--;
        }
        opDrawRel() {
            var startX = this.stream.readUint8();
            var startY = this.stream.readUint8();
            while (true) {
                var val = this.stream.readUint8();
                if (val >= 0xF0)
                    break;
                var xDisp = (val >>> 4) & 0x07;
                if ((val & 0x80) === 0x80)
                    xDisp = -xDisp;
                var yDisp = val & 0x07;
                if ((val & 8) == 8)
                    yDisp = -yDisp;
                var nextX = startX + xDisp;
                var nextY = startY + yDisp;
                this.drawLine(startX, startY, nextX, nextY);
                startX = nextX;
                startY = nextY;
            }
            this.stream.position--;
        }
        opFillFastQueue() {
            var debug = "FILL: "
            while (true) {
                var queue = new Agi.FastQueue();
                var startX = this.stream.readUint8();
                debug += startX + ", "

                if (startX >= 0xF0)
                    break;
                var startY = this.stream.readUint8();
                debug += startY + ", "

                queue.enqueue(startX);
                queue.enqueue(startY);
                // Visible
                var pos;
                var x;
                var y;
                while (!queue.isEmpty()) {
                    x = queue.dequeue();
                    y = queue.dequeue();
                    if (this.picEnabled) {
                        if (this.visible.data[y * Bitmap.width + x] != 0x0F)
                            continue;
                        this.setPixel(x, y, true, false);
                    }
                    if (this.priEnabled) {
                        if (this.priority.data[y * Bitmap.width + x] != 0x04)
                            continue;
                        this.setPixel(x, y, false, true);
                    }
                    if (x > 0) {
                        queue.enqueue(x - 1);
                        queue.enqueue(y);
                    }
                    if (x < Bitmap.width - 1) {
                        queue.enqueue(x + 1);
                        queue.enqueue(y);
                    }
                    if (y > 0) {
                        queue.enqueue(x);
                        queue.enqueue(y - 1);
                    }
                    if (y < Bitmap.height - 1) {
                        queue.enqueue(x);
                        queue.enqueue(y + 1);
                    }
                }
            }
            this.stream.position--;
            //console.log(debug)
        }
        opSetPen() {
            var value = this.stream.readUint8();
            this.penSplatter = ((value & 0x20) == 0x20);
            this.penRectangle = ((value & 0x10) == 0x10);
            this.penSize = value & 0x07;
        }
        drawPenRect(penX, penY) {
            var w = this.penSize + 1;
            var left = penX - Math.ceil(w / 2);
            var right = penX + Math.floor(w / 2);
            var top = penY - w;
            var bottom = penY + w;
            for (var x = left; x <= right; x++) {
                for (var y = top; y <= bottom; y++) {
                    this.setPixel(x, y);
                }
            }
        }
        drawPenCircle(x, y) {
        }
        drawPenSplat(x, y, texture) {
        }

        opDrawPen() {
            while (true) {
                
                var firstArg = this.stream.readUint8();
                if (firstArg >= 0xF0)
                    break;
                if (this.penSplatter) {
                    var texNumber = firstArg;
                    var x = this.stream.readUint8();
                    var y = this.stream.readUint8();
                    this.drawPenSplat(x, y, texNumber);
                }
                else {
                    var x = firstArg;
                    var y = this.stream.readUint8();
                    if (this.penSize == 0) {
                        this.setPixel(x, y);
                    }
                    else if (this.penRectangle) {
                        this.drawPenRect(x, y);
                    }
                    else {
                        this.drawPenCircle(x, y);
                    }
                }
            }
            this.stream.position--;
        }


        draw(visualBuffer, priorityBuffer) {
            this.stream.position = 0;
            this.visible = visualBuffer;
            this.priority = priorityBuffer;
            var processing = true;
            var func = ""

            while (processing) {
                func = ""
                var opCode = this.stream.readUint8();

                if (opCode >= 0xF0) {
                    // opcode
                    switch (opCode) {
                        case PicOpcode.PicSetColor:
                            this.picEnabled = true;
                            this.picColor = this.stream.readUint8();
                            break;
                        case PicOpcode.PicDisable:
                            this.picEnabled = false;
                            break;
                        case PicOpcode.PriSetcolor:
                            this.priEnabled = true;
                            this.priColor = this.stream.readUint8();
                            break;
                        case PicOpcode.PriDisable:
                            this.priEnabled = false;
                            break;
                        case PicOpcode.DrawYCorner:
                            this.opDrawYCorner();
                            break;
                        case PicOpcode.DrawXCorner:
                            this.opDrawXCorner();
                            break;
                        case PicOpcode.DrawAbs:
                            this.opDrawAbs();
                            break;
                        case PicOpcode.DrawRel:
                            this.opDrawRel();
                            break;
                        case PicOpcode.DrawFill:
                            this.opFillFastQueue();
                            break;
                        case PicOpcode.SetPen:
                            this.opSetPen();
                            break;
                        case PicOpcode.DrawPen:
                            this.opDrawPen();
                            break;
                        case PicOpcode.End:
                            processing = false;
                            break;
                    }
                }


            }
        }
    }
    Agi.Pic = Pic;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class Sound {
        constructor(soundNo, data, flag, soundOn) {
            this.soundOn = soundOn
            this.soundNo = soundNo
            this.audioCtx =  new AudioContext()
            this.oscillator = this.audioCtx.createOscillator() 
            this.oscillator.connect(this.audioCtx.destination);

            this.flag = flag
            this.data = data;
            this.started = false;
            this.ended = false;
            this.frame = -1;

            this.voices = {
                voice1: {
                    durationRemaining: 0,
                    audioStop: true,
                    fequency: 0,
                    position: 0,
                    offset: 0
                },
                voice2: {
                    durationRemaining: 0,
                    audioStop: true,
                    fequency: 0,
                    position: 0,
                    offset: 0
                },
                voice3: {
                    durationRemaining: 0,
                    audioStop: true,
                    fequency: 0,
                    position: 0,
                    offset: 0
                },
                voice4: {
                    durationRemaining: 0,
                    audioStop: true,
                    fequency: 0,
                    position: 0,
                    offset: 0
                }
            };
        }
        doSoundFrame() {
            if(this.voices.voice1.durationRemaining > 0) { 
                
                if(this.soundOn) {
                    this.oscillator.frequency.setValueAtTime(this.voices.voice1.frequency, this.audioCtx.currentTime); // value in hertz                 
                }

                var now = new Date().getTime();
                while (new Date().getTime() < now + 5) {   }
            }
            this.voices.voice1.durationRemaining = this.voices.voice1.durationRemaining - 3000;
        }
        play(soundNo, flagNo) {
            if(this.soundOn) {
                this.oscillator.start()
            }

            this.ended = false    
            this.started = true
            this.frame = 0;
            this.playCycle();
        }
        stop() {
            this.ended = true;
            window.started = false;
            
            if(this.soundOn) {
                this.oscillator.stop();
            }

            this.oscillator.disconnect();

            Agi.interpreter.flags[this.flag] = true    
        }
        playCycle() {
            var readNextFrame = false;
            if (this.started == false) {
                this.started = true;
                readNextFrame = true;
            }
            else if (this.voices.voice1.durationRemaining <= 0) {
                readNextFrame = true;
            }
            if (readNextFrame) {
                this.frame = this.frame + 1; // starts at -1 so first frame is 0
                var littleEndian = false;
                // read the header
                this.data.position = 0;
                var v1Offest = this.data.readUint8(littleEndian);

                var v2Offest = this.data.readUint8();
                var v3Offest = this.data.readUint8();
                var v4Offest = this.data.readUint8();
                // calculate the frame 
                this.data.position = this.voices.voice1.offset + (this.frame * 5);
                // Get the frequency for the duration frame
                var duration = this.data.readUint16(false);
                var noteHigh = this.data.readUint8();
                var noteLow = this.data.readUint8();
                var maxNoteLow = this.data.readUint8();

                // decode the frequency
                this.voices.voice1.offset = v1Offest;
                this.voices.voice1.durationRemaining = duration;
                this.voices.voice1.frequency = 99320 / (((noteHigh & 0x3F) << 4) + (noteLow & 0x0F));

                if (duration == 65535 /* 0xFF 0xFF */) {
                    // marks the end of the audio
                    this.stop();
                    
                }
                else if (isFinite(this.voices.voice1.frequency) == false) {
                    this.voices.voice1.frequency = 0;
                }
            }

            if (this.ended == false) {
                this.doSoundFrame();
            }
        }
    }
    Agi.Sound = Sound;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class Cel {
        constructor(width, height, transparentColor, mirrored, mirroredLoop) {
            this.width = width;
            this.height = height;
            this.transparentColor = transparentColor;
            this.mirrored = mirrored;
            this.mirroredLoop = mirroredLoop;
        }
    }
    Agi.Cel = Cel;
    class Loop {
        constructor() {
            this.cels = [];
        }
    }
    Agi.Loop = Loop;
    class View {
        constructor(data) {
            this.loops = [];
            var unk1 = data.readUint8();
            var unk2 = data.readUint8();
            var numLoops = data.readUint8();
            var descriptionOffset = data.readUint16();

            for (var i = 0; i < numLoops; i++) {

                // Loop header
                var loop = new Loop();

                var loopOffset = data.readUint16();
                var streamPosLoop = data.position;
                data.position = loopOffset;
                var numCels = data.readUint8();

                for (var j = 0; j < numCels; j++) {
                    var celOffset = data.readUint16();
                    var streamPosCel = data.position;
                    data.position = loopOffset + celOffset;
                    // Cel header
                    var celWidth = data.readUint8();
                    var celHeight = data.readUint8();
                    var celMirrorTrans = data.readUint8();

                    var celMirrored = (celMirrorTrans & 0x80) == 0x80;
                    var celMirrorLoop = (celMirrorTrans >>> 4) & 7;
                    var celTransparentColor = celMirrorTrans & 0x0F;
                    if (celMirrorLoop == i)
                        celMirrored = false;
                    var cel = new Cel(celWidth, celHeight, celTransparentColor, celMirrored, celMirrorLoop);
                    if (!celMirrored) {
                        cel.pixelData = new Uint8Array(cel.width * cel.height);
                        for (var k = 0; k < cel.pixelData.length; k++) {
                            cel.pixelData[k] = celTransparentColor;
                        }
                        var celY = 0;
                        var celX = 0;
                        var chunkIdx = 0;
                        var quit=false
                        while (chunkIdx <= cel.width * cel.height){ //true) {
                            var chunkData = data.readUint8();
                            chunkIdx++

                            if (chunkData == 0) {
                                celX = 0;
                                celY++;
                                if (celY >= celHeight)
                                    break;
                            }
                            var color = chunkData >>> 4;
                            var numPixels = chunkData & 0x0F;
                            for (var x = 0; x < numPixels; x++) {
                                cel.pixelData[celY * celWidth + celX + x] = color;
                            }
                            celX += numPixels;
                        }
                    }
                    loop.cels[j] = cel;
                    data.position = streamPosCel;
                }
                this.loops[i] = loop;
                data.position = streamPosLoop;
            }
            data.position = descriptionOffset;
            while (true) {
                var chr = data.readUint8();
                if (chr == 0)
                    break;
                this.description += String.fromCharCode(chr);
            }
var codes = ""
for(var i=data.startPosition; i < data.startPosition+200; i++) {
    codes+= data.buffer[i]+", "
}
        }
    }
    Agi.View = View;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class FastQueue {
        constructor() {
            this.maxSize = 8000;
            this.container = new Uint8Array(this.maxSize);
            this.eIndex = 0;
            this.dIndex = 0;
        }
        isEmpty() {
            return this.eIndex == this.dIndex;
        }
        enqueue(val) {
            if (this.eIndex + 1 == this.dIndex || (this.eIndex + 1 == this.maxSize && this.dIndex == 0))
                throw "Queue overflow";
            this.container[this.eIndex++] = val;
            if (this.eIndex == this.maxSize)
                this.eIndex = 0;
        }
        dequeue() {
            if (this.dIndex == this.maxSize)
                this.dIndex = 0;
            if (this.dIndex == this.eIndex)
                throw "The queue is empty";
            return this.container[this.dIndex++];
        }
    }
    Agi.FastQueue = FastQueue;
})(Agi || (Agi = {}));
var Fs;
(function (Fs) {
    class ByteStream {
        constructor(buffer, startPosition = 0, end = 0) {
            this.buffer = buffer;
            this.startPosition = startPosition;
            this.end = end;
            this.position = 0;
            this.length = 0;
            if (end == 0)
                this.end = this.buffer.byteLength;
            this.length = this.end - this.startPosition;
        }
        readUint8() {
            return this.buffer[this.startPosition + this.position++];
        }
        readUint16(littleEndian = true) {
            var b1 = this.buffer[this.startPosition + this.position++];
            var b2 = this.buffer[this.startPosition + this.position++];
            if (littleEndian) {
                return (b2 << 8) + b1;
            }
            return (b1 << 8) + b2;
        }
        readInt16(littleEndian = true) {
            var b1 = this.buffer[this.startPosition + this.position++];
            var b2 = this.buffer[this.startPosition + this.position++];
            if (littleEndian) {
                return ((((b2 << 8) | b1) << 16) >> 16);
            }
            return ((((b1 << 8) | b2) << 16) >> 16);
        }
    }
    Fs.ByteStream = ByteStream;
    function downloadAllFiles(path, files, done) {
        var buffers = {};
        var leftToDownload = files.length;
        function getBinary(url, success) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.response === null) {
                        throw "Fatal error downloading '" + url + "'";
                    }
                    else {
                        success(xhr.response);
                    }
                }
            };
            xhr.send();
        }
        function handleFile(num) {
            getBinary(path + files[num], (buffer) => {
                buffers[files[num]] = new ByteStream(new Uint8Array(buffer));
                leftToDownload--;
                if (leftToDownload === 0) {
                    done(buffers);
                }
            });
        }
        for (var i = 0; i < files.length; i++) {
            handleFile(i);
        }
    }
    Fs.downloadAllFiles = downloadAllFiles;
})(Fs || (Fs = {}));
var Agi;
(function (Agi) {
    let MovementFlags;
    (function (MovementFlags) {
        MovementFlags[MovementFlags["Normal"] = 0] = "Normal";
        MovementFlags[MovementFlags["ChaseEgo"] = 1] = "ChaseEgo";
        MovementFlags[MovementFlags["Wander"] = 2] = "Wander";
        MovementFlags[MovementFlags["MoveTo"] = 3] = "MoveTo";
    })(MovementFlags = Agi.MovementFlags || (Agi.MovementFlags = {}));
    let Direction;
    (function (Direction) {
        Direction[Direction["Stopped"] = 0] = "Stopped";
        Direction[Direction["Up"] = 1] = "Up";
        Direction[Direction["UpRight"] = 2] = "UpRight";
        Direction[Direction["Right"] = 3] = "Right";
        Direction[Direction["DownRight"] = 4] = "DownRight";
        Direction[Direction["Down"] = 5] = "Down";
        Direction[Direction["DownLeft"] = 6] = "DownLeft";
        Direction[Direction["Left"] = 7] = "Left";
        Direction[Direction["UpLeft"] = 8] = "UpLeft";
    })(Direction = Agi.Direction || (Agi.Direction = {}));
    class GameObject {
        constructor() {
            this.pockets = []
            this.x = 0;
            this.y = 0;
            this.draw = false;
            this.redraw = false;
            this.direction = Direction.Stopped;
            this.viewNo = 0;
            this.loop = 0;
            this.cel = 0;
            this.fixedLoop = false;
            this.priority = 0;
            this.fixedPriority = false;
            this.reverseCycle = false;
            this.cycleTime = 1;
            this.celCycling = false;
            this.callAtEndOfLoop = false;
            this.flagToSetWhenFinished = 0;
            this.ignoreHorizon = false;
            this.ignoreBlocks = false;
            this.ignoreObjs = false;
            this.motion = false;
            this.stepSize = 1;
            this.stepTime = 0;
            this.moveToX = 0;
            this.moveToY = 0;
            this.moveToStep = 0;
            this.movementFlag = MovementFlags.Normal;
            this.allowedSurface = 0;
            this.update = true;
            this.reverseLoop = false;
            this.nextCycle = 1;
            this.oldX = 0;
            this.oldY = 0;
            this.nextLoop = 0;
            this.nextCel = 0;
            this.oldLoop = 0;
            this.oldCel = 0;
            this.oldView = 0;
            this.oldPriority = 0;
            this.oldDrawX = 0;
            this.oldDrawY = 0;
        }
    }
    Agi.GameObject = GameObject;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class Interpreter {
        constructor(context) {
            this.rdDebug = false;
            this.scoreTotal = 0;
            this.context = context;
            this.newroom = 0;
            this.scriptSize = 0;
            this.strings = [];
            this.variables = new Uint8Array(255);
            this.flags = [];
            this.msgBoxText = null;
            this.msgBoxWidth = 128;
            this.loadedViews = [];
            this.loadedLogics = [];
            this.loadedPics = [];
            this.loadedSounds = [];
            this.logicStack = [];
            this.logicNo = 0;
            this.gameObjects = [];
            this.keyboardSpecialBuffer = [];
            this.keyboardCharBuffer = [];
            this.inputBuffer = "";
            this.allowInput = true;
            this.haveKey = false;
            this.screen = new Agi.Screen(this);
            this.dialogueBox = new Agi.Dialogue();
            this.visualBuffer = new Agi.Bitmap();
            this.priorityBuffer = new Agi.Bitmap();
            this.framePriorityData = new Agi.Bitmap();
            this.frameData = this.context.createImageData(320, 200);
            var data = this.frameData.data;
            for (var i = 0; i < 320 * 200; i++) {
                data[i * 4 + 0] = 0x00;
                data[i * 4 + 1] = 0x00;
                data[i * 4 + 2] = 0x00;
                data[i * 4 + 3] = 0xFF;
            }
        }
        start() {
            /* Reset all state */
            for (var i = 0; i < 255; i++) {
                this.variables[i] = 0;
                this.flags[i] = false;
            }
            this.variables[0] = 0;
            this.variables[26] = 3; // EGA
            this.variables[8] = 255; // Pages of free memory
            this.variables[23] = 15; // Sound volume
            this.variables[24] = 41; // Input buffer size
            this.flags[9] = true; // Sound enabled
            this.flags[11] = true; // Logic 0 executed for the first time
            this.flags[5] = true; // Room script executed for the first time
            this.agi_unanimate_all();
            this.agi_load_logic(0);
            this.cycle();
        }
        setEgoDir(newEgoDir) {
            if(!this.programControl) {
                let egoDir = this.variables[6];
                this.variables[6] = egoDir == newEgoDir ? 0 : newEgoDir;    
            }
        }
        cycle() {
            this.flags[2] = false; // The player has entered a command
            this.flags[4] = false; // said accepted user input
            this.haveKey = (this.keyboardCharBuffer.length + this.keyboardSpecialBuffer.length) > 0;
            if (this.allowInput) {
                while (this.keyboardSpecialBuffer.length > 0) {
                    var key = this.keyboardSpecialBuffer.shift();
                    if (!this.dialogue) {
                        if (key == 37) // left
                            this.setEgoDir(7);
                        else if (key == 36) // left-up
                            this.setEgoDir(8);
                        else if (key == 38) // up
                            this.setEgoDir(1);
                        else if (key == 33) // right-up
                            this.setEgoDir(2);
                        else if (key == 39) // right
                            this.setEgoDir(3);
                        else if (key == 34) // right-down
                            this.setEgoDir(4);
                        else if (key == 40) // down
                            this.setEgoDir(5);
                        else if (key == 35) // down-left
                            this.setEgoDir(6);
                        else if (key == 12) // stop
                            this.setEgoDir(0);
                        else if (key == 27) { // Escape
                        }
                        else if (key == 13) {
                            this.dialogue = false;
                            this.agi_close_dialogue();
                            this.flags[2] = true; // The player has entered a command
                            this.keyboardCharBuffer = [];
                            this.dialogueBox.innerEl.innerHTML = ""
                        }
                        else if (key == 8) {
                            this.inputBuffer = this.inputBuffer.substr(0, this.inputBuffer.length - 1);
                        }
                    }
                    else if (key == 13) {
                        this.dialogue = false;
                        this.agi_close_dialogue();
                    }
                }
                while (this.keyboardCharBuffer.length > 0) {
                    var key = this.keyboardCharBuffer.shift();
                    if (key >= 32 && key < 127 && this.inputBuffer.length < this.variables[24]) {
                        this.inputBuffer += String.fromCharCode(key);
                    }
                    else if (key == 8 && this.inputBuffer.length > 0) { // Backspace
                        this.inputBuffer = this.inputBuffer.substr(0, this.inputBuffer.length - 1);
                    }
                    else if (key == 13) {
                        this.dialogue = false;
                        this.agi_close_dialogue();
                        this.flags[2] = true; // The player has entered a command
                        this.keyboardCharBuffer = [];
                        this.inputBuffer = ""
                        break;
                    }
                }
            }
            let egoDir = this.variables[6];
            if (this.dialogue) {
                if (this.dialogueMode == 1) { // string input
                    this.strings[this.dialogueStrNo] = this.inputBuffer;
                    this.screen.bltText(this.dialogueStrY, this.dialogueStrX, this.dialoguePrompt + this.strings[this.dialogueStrNo]);
                }
            }
            this.keyboardCharBuffer = [];
            this.keyboardSpecialBuffer = [];
            if (this.programControl) {
                egoDir = this.variables[6];
            }
            else {
                this.variables[6] = egoDir;
            }
            // calculate direction of movement
            while (true) {
                this.agi_call(0);
                this.flags[11] = false; // Logic 0 executed for the first time
                //this.gameObjects[0].direction = this.variables[6];
                this.variables[5] = 0;
                this.variables[4] = 0;
                this.flags[5] = false;
                this.flags[6] = false;
                this.flags[12] = false;
                for (var j = 0; j < this.gameObjects.length; j++) {
                    var obj = this.gameObjects[j];
                    if (obj.update) {
                        if (j == 0)
                            obj.direction = egoDir;
                        //else
                        //    obj.updateDirection(this);
                        this.updateObject(obj, j);
                    }
                }
                if (this.newroom != 0) {
                    this.agi_stop_update(0);
                    this.agi_unanimate_all();
                    this.loadedLogics = this.loadedLogics.slice(0, 1);
                    this.agi_player_control();
                    this.agi_unblock();
                    this.agi_set_horizon(36);
                    this.variables[1] = this.variables[0];
                    this.variables[0] = this.newroom;
                    this.variables[4] = 0;
                    this.variables[5] = 0;
                    this.variables[9] = 0;
                    this.variables[16] = this.gameObjects[0].viewNo;
                    switch (this.variables[2]) {
                        case 0: // Touched nothing
                            break;
                        case 1: // Top edge or horizon
                            this.gameObjects[0].y = 168;
                            break;
                        case 2:
                            this.gameObjects[0].x = 1;
                            break;
                        case 3:
                            this.gameObjects[0].y = this.horizon;
                            break;
                        case 4:
                            this.gameObjects[0].x = 160;
                            break;
                        default:
                    }
                    this.variables[2] = 0;
                    this.flags[2] = false;
                    this.flags[4] = false;    //RDX 
                    this.inputBuffer = ""
                    
                    this.agi_load_logic_v(0);
                    this.flags[5] = true;
                    this.newroom = 0;
                }
                else {
                    break;
                }
            }

            if(this.rdDebug) {
                this.screen.bltText(1, 0, "" + this.flags[0]);
                this.screen.bltText(2, 0, "" + this.variables[42]);
                this.screen.bltText(3, 0, "" + this.variables[43]);
                this.screen.bltText(4, 0, "" + this.gameObjects[0].x + ", " + this.gameObjects[0].y+" : "+ this.gameObjects[0].direction);
                this.screen.bltText(5, 0, "" + this.variables[19]);
                this.screen.bltText(6, 0, "" + this.variables[10]);    
            }

            this.screen.bltText(21, 0, "]");
            this.screen.bltText(21, 2, "                                                                            ");
            this.screen.bltText(21, 2, "" + this.inputBuffer);

            this.bltFrame();
            // do sound
            if (this.sound && this.sound.started == true && this.sound.ended == false) {
                this.sound.playCycle();
            }

            this.doMenuBar()   
        }
        doMenuBar() {
        var canvasEl = document.getElementById("canvas")
        var menuEl = document.getElementById("menu")
            if(!menuEl) {
                menuEl = (menuEl) ? menuEl : document.createElement("div");
                menuEl.id = "menu"
                document.body.appendChild(menuEl);    
            }
            menuEl.style.display = "block";
            menuEl.style.width = "98%";
            menuEl.style.top = "0px";
            //menuEl.style.position = "absolute";
            menuEl.style.backgroundColor = "white";
            menuEl.style.border = "3px solid black";
            menuEl.style.marginRight = "25%";
            menuEl.style.fontSize = "x-large";
            menuEl.innerHTML = "<div style='float:left'>" 
                             + "<strong>&nbsp; Score: " 
                             + this.variables[3] 
                             + " of " 
                             + this.variables[7] 
                             + "</strong></div>"
                             +"<div style='float:right; margin-right:25px;'>" 
                             + "<strong>&nbsp; Sound: " 
                             + ((this.flags[9]) ? "On" : "Off") 
        }
        bltFrame() {
            /*var data = this.frameData.data;
            for (var k = 0; k < Bitmap.width * Bitmap.height; k++) {
                var rgb = Agi.palette[this.framePriorityData.data[k]];
                data[k * 8 + 0] = (rgb >>> 16) & 0xFF;
                data[k * 8 + 1] = (rgb >>> 8) & 0xFF;
                data[k * 8 + 2] = rgb & 0xFF;
                data[k * 8 + 3] = 255;
                data[k * 8 + 4] = (rgb >>> 16) & 0xFF;
                data[k * 8 + 5] = (rgb >>> 8) & 0xFF;
                data[k * 8 + 6] = rgb & 0xFF;
                data[k * 8 + 7] = 255;
            }*/
            this.context.putImageData(this.frameData, 0, 0);
        }
        updateObject(obj, no) {
        try {
            obj.oldX = obj.x;
            obj.oldY = obj.y;
            if (obj.draw) {
                var view = this.loadedViews[obj.viewNo];
                var cel = view.loops[obj.loop].cels[obj.cel];
                var xStep = obj.stepSize;
                var yStep = obj.stepSize;
                switch (obj.movementFlag) {
                    case Agi.MovementFlags.Normal:
                        break;
                    case Agi.MovementFlags.MoveTo:
                        if (obj.moveToStep != 0) {
                            xStep = yStep = obj.moveToStep;
                        }
                        if (obj.moveToX > obj.x) {
                            if (obj.moveToY > obj.y)
                                obj.direction = Agi.Direction.DownRight;
                            else if (obj.moveToY < obj.y)
                                obj.direction = Agi.Direction.UpRight;
                            else
                                obj.direction = Agi.Direction.Right;
                        }
                        else if (obj.moveToX < obj.x) {
                            if (obj.moveToY > obj.y)
                                obj.direction = Agi.Direction.DownLeft;
                            else if (obj.moveToY < obj.y)
                                obj.direction = Agi.Direction.UpLeft;
                            else
                                obj.direction = Agi.Direction.Left;
                        }
                        else {
                            if (obj.moveToY > obj.y)
                                obj.direction = Agi.Direction.Down;
                            else if (obj.moveToY < obj.y)
                                obj.direction = Agi.Direction.Up;
                        }
                        yStep = Math.min(yStep, Math.abs(obj.y - obj.moveToY));
                        xStep = Math.min(xStep, Math.abs(obj.x - obj.moveToX));
                        break;

                    case Agi.MovementFlags.ChaseEgo:
                        let egoX = this.gameObjects[0].x
                        let egoY = this.gameObjects[0].y

                        if (obj.moveToStep != 0) {
                            xStep = yStep = obj.moveToStep;
                        }
                        if (egoX > obj.x) {
                            if (egoY > obj.y)
                                obj.direction = Agi.Direction.DownRight;
                            else if (egoY < obj.y)
                                obj.direction = Agi.Direction.UpRight;
                            else
                                obj.direction = Agi.Direction.Right;
                        }
                        else if (egoX < obj.x) {
                            if (egoY > obj.y)
                                obj.direction = Agi.Direction.DownLeft;
                            else if (egoY < obj.y)
                                obj.direction = Agi.Direction.UpLeft;
                            else
                                obj.direction = Agi.Direction.Left;
                        }
                        else {
                            if (egoY > obj.y)
                                obj.direction = Agi.Direction.Down;
                            else if (egoY < obj.y)
                                obj.direction = Agi.Direction.Up;
                        }
                        yStep = Math.min(yStep, Math.abs(obj.y - egoY));
                        xStep = Math.min(xStep, Math.abs(obj.x - egoX));
                        
                        if((obj.x == egoX || obj.x == egoX-1 || obj.x == egoX+1)
                        && (obj.y == egoY || obj.y == egoY-1 || obj.y == egoY+1)) {
                            this.flags[obj.flagToSetWhenFinished] = true
                            obj.movementFlag = Agi.MovementFlags.Normal
                        }
                        break;

                    case Agi.MovementFlags.Wander:
                        if (obj.moveToStep != 0) {
                            obj.moveToStep = 3
                            obj.direction = this.randomBetween(1, 9);
                        }
                        obj.moveToStep--
                        break;
                    default:
                }

                var newX = obj.x;
                var newY = obj.y;
                if (obj.direction == 1 || obj.direction == 2 || obj.direction == 8)
                    newY = obj.y - yStep;
                else if (obj.direction == 5 || obj.direction == 4 || obj.direction == 6)
                    newY = obj.y + yStep;
                if (obj.direction == 7 || obj.direction == 8 || obj.direction == 6)
                    newX = obj.x - xStep;
                else if (obj.direction == 3 || obj.direction == 2 || obj.direction == 4)
                    newX = obj.x + xStep;
                if (obj.ignoreBlocks == false && newY != obj.y) {
                    for (var xNumber = 0; xNumber < cel.width; xNumber++) {
                        var idx = newY * 160 + (obj.x + xNumber);

                        if(no == 0) {
                            if (this.priorityBuffer.data[idx] == 3) {
                                this.flags[0]=true
                            }
                            else {
                                this.flags[0]=false
                            }
                        }
                        else {
                            if (this.priorityBuffer.data[idx] != 3) {
                                if(obj.allowedSurface == 3) {
                                    // things in the water should stay in the water
                                    obj.x = obj.oldX
                                    obj.y = obj.oldY
                                    newX = obj.oldX
                                    newY = obj.oldY

                                    if(newY > 166) {
                                        newY = 166
                                    }
                                }
                            }
                        }

                        if (this.priorityBuffer.data[idx] == 0 
                        || this.priorityBuffer.data[idx] == 1) {
                            if(no == 0) {
                                newX = obj.x;
                                newY = obj.y;
                                obj.direction = 0;
                            }
                        //    break;
                        }
                    }
                }
                obj.y = newY;
                if (obj.ignoreBlocks == false && newX != obj.x) {
                    var leftIdx = obj.y * 160 + newX;
                    var rightIdx = obj.y * 160 + newX + cel.width;

                    if(no == 0) {
                        if (this.priorityBuffer.data[leftIdx] == 3 || this.priorityBuffer.data[rightIdx] == 3) {
                            this.flags[0]=true
                        }
                        else {
                            this.flags[0]=false
                        }    
                    }
                    else {
                        if (this.priorityBuffer.data[leftIdx] != 3 || this.priorityBuffer.data[rightIdx] != 3) {
                            if(obj.allowedSurface == 3) {
                                // things in the water should stay in the water
                                obj.x = obj.oldX
                                obj.y = obj.oldY
                                newX = obj.oldX
                                newY = obj.oldY

                                if(newY > 166) {
                                    newY = 166
                                }
                            }
                        }
                    }

                    if (this.priorityBuffer.data[leftIdx] == 0 || this.priorityBuffer.data[rightIdx] == 0 || this.priorityBuffer.data[leftIdx] == 1 || this.priorityBuffer.data[rightIdx] == 1) {
                        newX = obj.x;
                        obj.direction = 0;
                    }
                }
                obj.x = newX;
                if (obj.movementFlag == Agi.MovementFlags.MoveTo && obj.x == obj.moveToX && obj.y == obj.moveToY) {
                    obj.direction = Agi.Direction.Stopped;
                    this.flags[obj.flagToSetWhenFinished] = true;
                    obj.movementFlag = Agi.MovementFlags.Normal;
                }
                if (obj.x != obj.oldX || obj.y != obj.oldY) {
                    if (obj.x <= 0) {
                        if (no == 0) {  
                            this.variables[2] = 4;
                        } else {
                            this.variables[4] = no;
                            this.variables[5] = 4;
                        }
                    }
                    else if (obj.x + cel.width >= 160) {
                        if (no == 0)
                            this.variables[2] = 2;
                        else {
                            this.variables[4] = no;
                            this.variables[5] = 2;
                        }
                    }
                    else if (!obj.ignoreHorizon && obj.y <= this.horizon) {
                        if (no == 0)
                            this.variables[2] = 1;
                        else {
                            this.variables[4] = no;
                            this.variables[5] = 1;
                        }
                    }
                    else if (obj.y >= 168) {
                        if (no == 0)
                            this.variables[2] = 3;
                        else {
                            this.variables[4] = no;
                            this.variables[5] = 3;
                        }
                    }
                }
                if (!obj.fixedPriority) {
                    if (obj.y < 48)
                        obj.priority = 4;
                    else if (obj.y == 168)
                        obj.priority = 15;
                    else
                        obj.priority = ((obj.y / 12) | 0) + 1;
                }
                if (!obj.fixedLoop) {
                    if (view.loops.length > 1 && view.loops.length < 4) {
                        if (obj.direction == 2 || obj.direction == 3 || obj.direction == 4 ||
                            obj.direction == 6 || obj.direction == 7 || obj.direction == 8)
                            obj.loop = 1;
                    }
                    else if (view.loops.length >= 4) {
                        if (obj.direction == 1)
                            obj.loop = 3;
                        else if (obj.direction == 2 || obj.direction == 3 || obj.direction == 4)
                            obj.loop = 0;
                        else if (obj.direction == 5)
                            obj.loop = 2;
                        else if (obj.direction == 6 || obj.direction == 7 || obj.direction == 8)
                            obj.loop = 1;
                    }
                }
                if (obj.celCycling) {
                    if (obj.nextCycle == 1) {
                        if (obj.reverseCycle)
                            obj.cel--;
                        else
                            obj.cel++;
                        var endOfLoop = false;
                        if (obj.cel < 0) {
                            if (obj.callAtEndOfLoop)
                                obj.cel = 0;
                            else
                                obj.cel = view.loops[obj.loop].cels.length - 1;
                            endOfLoop = true;
                        }
                        else if (obj.cel > view.loops[obj.loop].cels.length - 1) {
                            if (obj.callAtEndOfLoop)
                                obj.cel = view.loops[obj.loop].cels.length - 1;
                            else
                                obj.cel = 0;
                            endOfLoop = true;
                        }
                        if (endOfLoop && obj.callAtEndOfLoop) {
                            obj.celCycling = false;
                            this.flags[obj.flagToSetWhenFinished] = true;
                        }
                        obj.nextCycle = obj.cycleTime;
                    }
                    else
                        obj.nextCycle--;
                }
                this.screen.drawObject(obj, no);
            }
        }
        catch(err) {
            //console.log(err)
        }

        }
        randomBetween(min, max) {
            return ((Math.random() * (max - min)) + min) | 0;
        }
        // ReSharper disable InconsistentNaming
        agi_increment(varNo) {
            if (this.variables[varNo] < 255)
                this.variables[varNo]++;
        }
        agi_decrement(varNo) {
            if (this.variables[varNo] > 0)
                this.variables[varNo]--;
        }
        agi_assignn(varNo, num) {
            this.variables[varNo] = num;
        }
        agi_assignv(varNo1, varNo2) {
            this.agi_assignn(varNo1, this.variables[varNo2]);
        }
        agi_addn(varNo, num) {
            this.variables[varNo] += num;
        }
        agi_addv(varNo1, varNo2) {
            this.agi_addn(varNo1, this.variables[varNo2]);
        }
        agi_subn(varNo, num) {
            this.variables[varNo] -= num;
        }
        agi_subv(varNo1, varNo2) {
            this.agi_subn(varNo1, this.variables[varNo2]);
        }
        agi_lindirectn(varNo, val) {
            this.variables[this.variables[varNo]] = val;
        }
        agi_lindirectv(varNo1, varNo2) {
            this.agi_lindirectn(varNo1, this.variables[varNo2]);
        }
        agi_rindirect(varNo1, varNo2) {
            this.variables[varNo1] = this.variables[this.variables[varNo2]];
        }
        agi_set(flagNo) {
            this.flags[flagNo] = true;
        }
        agi_reset(flagNo) {
            this.flags[flagNo] = false;
        }
        agi_toggle(flagNo) {
            this.flags[flagNo] = !this.flags[flagNo];
        }
        agi_setv(varNo) {
            this.agi_set(this.variables[varNo]);
        }
        agi_reset_v(varNo) {
            this.agi_reset(this.variables[varNo]);
        }
        agi_set_v(varNo) {
            this.variables[varNo] = 0
        }
        agi_togglev(varNo) {
            this.agi_toggle(this.variables[varNo]);
        }
        agi_call(logicNo) {
            this.logicStack.push(this.logicNo);
            this.logicNo = logicNo;
            if (this.loadedLogics[logicNo] != null) {
                this.loadedLogics[logicNo].parseLogic();
            }
            else {
                this.agi_load_logic(logicNo);
                this.loadedLogics[logicNo].parseLogic();
                this.loadedLogics[logicNo] = null;
            }
            this.logicNo = this.logicStack.pop();
        }
        agi_call_v(varNo) {
            this.agi_call(this.variables[varNo]);
        }
        agi_print_at(msgNo, x, y, width) {
        }
        agi_print_atv(varNo, x, y, width) {
            this.agi_print_at(this.variables[varNo], x, y, width);
        }
        agi_muln(varNo, val) {
            this.variables[this.variables[varNo]] *= val;
        }
        agi_mulv(varNo1, varNo2) {
            this.agi_muln(varNo1, this.variables[varNo2]);
        }
        agi_div_n(varNo, val) {
            this.agi_divn(varNo, val);
        }
        agi_divn(varNo, val) {
            this.variables[this.variables[varNo]] /= val;
        }
        agi_div_v(varNo1, varNo2) {
            this.agi_divv(varNo1, varNo2);
        }
        agi_divv(varNo1, varNo2) {
            this.agi_divn(varNo1, this.variables[varNo2]);
        }
        agi_new_room(roomNo) {
            this.newroom = roomNo;
        }
        agi_get_room_v(varNo) {
        }
        agi_new_room_v(varNo) {
            this.agi_new_room(this.variables[varNo]);
        }
        agi_load_pic(varNo) {
            var picNo = this.variables[varNo];
            this.loadedPics[picNo] = new Agi.Pic(Resources.readAgiResource(Resources.AgiResource.Pic, picNo));
        }
        agi_overlay_pic(varNo) {
            var picNo = this.variables[varNo];
            this.loadedPics[picNo].draw(this.visualBuffer, this.priorityBuffer);
        }
        agi_draw_pic(varNo) {
            this.visualBuffer.clear(0x0F);
            this.priorityBuffer.clear(0x04);
            this.agi_overlay_pic(varNo);
        }
        agi_show_pic() {
            this.screen.bltPic();
            this.gameObjects.forEach(obj => {
                obj.redraw = true;
            });
        }
        agi_discard_pic(varNo) {
            var picNo = this.variables[varNo];
            this.loadedPics[picNo] = null;
        }
        agi_get_posn(objNo, varNo1, varNo2) {
            this.variables[varNo1] = this.gameObjects[objNo].x;
            this.variables[varNo2] = this.gameObjects[objNo].y;
        }
        agi_stop_update(objNo) {
            this.gameObjects[objNo].update = false;
        }
        agi_animate_obj(objNo) {
            this.gameObjects[objNo] = new Agi.GameObject();
        }
        agi_draw(objNo) {
            this.gameObjects[objNo].draw = true;
            //this.drawObject(this.gameObjects[objNo], objNo);
        }
        agi_set_view(objNo, viewNo) {
            this.gameObjects[objNo].viewNo = viewNo;
            this.gameObjects[objNo].loop = 0;
            this.gameObjects[objNo].cel = 0;
            this.gameObjects[objNo].celCycling = true;
        }
        agi_set_view_v(objNo, varNo) {
            this.agi_set_view(objNo, this.variables[varNo]);
        }
        agi_unanimate_all() {
            this.gameObjects = [];
            for (var j = 0; j < 16; j++) {
                this.gameObjects[j] = new Agi.GameObject();
            }
        }
        agi_player_control() {
            this.programControl = false;
        }
        agi_program_control() {
            this.programControl = true;
        }
        agi_set_horizon(y) {
            this.horizon = y;
        }
        agi_unblock() {
            this.blockX1 = this.blockY1 = this.blockX2 = this.blockY2 = 0;
        }
        agi_load_view(viewNo) {
            this.loadedViews[viewNo] = new Agi.View(Resources.readAgiResource(Resources.AgiResource.View, viewNo));
        }
        agi_load_view_v(varNo) {
            this.agi_load_view(this.variables[varNo]);
        }
        agi_discard_view(viewNo) {
            this.loadedViews[viewNo] = null;
        }
        agi_discard_view_v(varNo) {
            this.agi_discard_view(this.variables[varNo]);
        }
        agi_observe_objs(objNo) {
            this.gameObjects[objNo].ignoreObjs = false;
        }
        agi_ignore_objs(objNo) {
            this.gameObjects[objNo].ignoreObjs = true;
        }
        agi_position(objNo, x, y) {
            this.gameObjects[objNo].x = x;
            this.gameObjects[objNo].y = y;
        }
        agi_position_v(objNo, varNo1, varNo2) {
            this.agi_position(objNo, this.variables[varNo1], this.variables[varNo2]);
        }
        agi_stop_cycling(objNo) {
            this.gameObjects[objNo].celCycling = false;
        }
        agi_start_cycling(objNo) {
            this.gameObjects[objNo].celCycling = true;
        }
        agi_normal_cycle(objNo) {
            this.gameObjects[objNo].reverseCycle = false;
        }
        agi_end_of_loop(objNo, flagNo) {
            this.gameObjects[objNo].callAtEndOfLoop = true;
            this.gameObjects[objNo].flagToSetWhenFinished = flagNo;
            this.gameObjects[objNo].celCycling = true;
        }
        agi_reverse_cycle(objNo) {
            this.gameObjects[objNo].reverseCycle = true;
        }
        agi_cycle_time(objNo, varNo) {
            this.gameObjects[objNo].cycleTime = this.variables[varNo];
        }
        agi_reverse_loop(objNo, flagNo) {
            this.gameObjects[objNo].reverseLoop = true;
//            this.gameObjects[objNo].callAtEndOfLoop = true;
            this.gameObjects[objNo].flagToSetWhenFinished = flagNo;
            this.gameObjects[objNo].celCycling = true;
        }
        agi_stop_motion(objNo) {
            if (objNo == 0)
                this.agi_program_control();
            this.gameObjects[objNo].motion = false;
            this.gameObjects[objNo].direction = Agi.Direction.Stopped;
        }
        agi_start_motion(objNo) {
            if (objNo == 0)
                this.agi_player_control();
            this.gameObjects[objNo].motion = true;
        }
        agi_normal_motion(objNo) {
            this.gameObjects[objNo].movementFlag = Agi.MovementFlags.Normal;
        }
        agi_step_size(objNo, varNo) {
            this.gameObjects[objNo].stepSize = this.variables[varNo];
        }
        agi_step_time(objNo, varNo) {
            this.gameObjects[objNo].stepTime = this.variables[varNo];
        }
        agi_set_loop(objNo, loopNo) {
            this.gameObjects[objNo].loop = loopNo;
        }
        agi_set_loop_v(objNo, varNo) {
            this.agi_set_loop(objNo, this.variables[varNo]);
        }
        agi_fix_loop(objNo) {
            this.gameObjects[objNo].fixedLoop = true;
        }
        agi_set_priority(objNo, priority) {
            this.gameObjects[objNo].priority = priority;
            this.gameObjects[objNo].fixedPriority = true;
        }
        agi_set_priority_v(objNo, varNo) {
            this.agi_set_priority(objNo, this.variables[varNo]);
        }
        agi_release_loop(objNo) {
            this.gameObjects[objNo].fixedLoop = false;
        }
        agi_set_cel(objNo, celNo) {
            this.gameObjects[objNo].nextCycle = 1;
            this.gameObjects[objNo].cel = celNo;
        }
        agi_set_cel_v(objNo, varNo) {
            this.agi_set_cel(objNo, this.variables[varNo]);
        }
        agi_last_cel(objNo, varNo) {
            var obj = this.gameObjects[objNo];
            this.variables[varNo] = this.loadedViews[obj.viewNo].loops[obj.loop].cels.length - 1;
        }
        agi_current_cel(objNo, varNo) {
            this.variables[varNo] = this.gameObjects[objNo].cel;
        }
        agi_current_loop(objNo, varNo) {
            this.variables[varNo] = this.gameObjects[objNo].loop;
        }
        agi_current_view(objNo, varNo) {
            this.variables[varNo] = this.gameObjects[objNo].viewNo;
        }
        agi_currentview(objNo, varNo) {
            this.variables[varNo] = this.gameObjects[objNo].viewNo;
        }
        agi_number_of_loops(objNo, varNo) {
            this.variables[varNo] = this.loadedViews[this.gameObjects[objNo].viewNo].loops.length;
        }
        agi_release_priority(objNo) {
            this.gameObjects[objNo].fixedPriority = false;
        }
        agi_get_priority(objNo, varNo) {
            this.variables[varNo] = this.gameObjects[objNo].priority;
        }
        agi_start_update(objNo) {
            this.gameObjects[objNo].update = true;
            //this.gameObjects[objNo].draw = true;
        }
        agi_force_update(objNo) {
            this.gameObjects[objNo].draw = true;
            this.agi_draw(objNo);
            //var obj: GameObject = this.gameObjects[objNo];
            //this.bltView(obj.viewNo, obj.loop, obj.cel, obj.x, obj.y, obj.priority, 4);
        }
        agi_ignore_horizon(objNo) {
            this.gameObjects[objNo].ignoreHorizon = true;
        }
        agi_observe_horizon(objNo) {
            this.gameObjects[objNo].ignoreHorizon = false;
        }
        agi_prevent_input() {
            this.allowInput = false;
        }
        agi_accept_input() {
            this.allowInput = true;
        }
        agi_add_to_pic(viewNo, loopNo, celNo, x, y, priority, margin) {
            // TODO: Add margin
            this.screen.bltView(viewNo, loopNo, celNo, x, y, priority);
        }
        agi_add_to_pic_v(varNo1, varNo2, varNo3, varNo4, varNo5, varNo6, varNo7) {
            this.agi_add_to_pic(this.variables[varNo1], this.variables[varNo2], this.variables[varNo3], this.variables[varNo4], this.variables[varNo5], this.variables[varNo6], this.variables[varNo7]);
        }
        agi_random(start, end, varNo) {
            this.variables[varNo] = this.randomBetween(start, end);
        }
        agi_move_obj(objNo, x, y, stepSpeed, flagNo) {
            var obj = this.gameObjects[objNo];
            obj.moveToX = x;
            obj.moveToY = y;
            obj.moveToStep = stepSpeed;
            obj.movementFlag = Agi.MovementFlags.MoveTo;
            obj.flagToSetWhenFinished = flagNo;
        }
        agi_move_obj_v(objNo, varNo1, varNo2, stepSpeed, flagNo) {
            this.agi_move_obj(objNo, this.variables[varNo1], this.variables[varNo2], 1, flagNo);
        }
        agi_follow_ego(objNo, stepSpeed, flagNo) {
            var obj = this.gameObjects[objNo];
            obj.moveToStep = stepSpeed;
            obj.flagToSetWhenFinished = flagNo;
            obj.movementFlag = Agi.MovementFlags.ChaseEgo;
        }
        agi_wander(objNo) {
            this.gameObjects[objNo].movementFlag = Agi.MovementFlags.Wander;
        }
        agi_normal_motion(objNo) {
            this.gameObjects[objNo].motion = true;
        }
        agi_set_dir(objNo, varNo) {
            this.gameObjects[objNo].direction = this.variables[varNo];
        }
        agi_get_dir(objNo, varNo) {
            this.variables[varNo] = this.gameObjects[objNo].direction;
        }
        agi_ignore_blocks(objNo) {
            this.gameObjects[objNo].ignoreBlocks = true;
        }
        agi_observe_blocks(objNo) {
            this.gameObjects[objNo].ignoreBlocks = false;
        }
        agi_block(x1, y1, x2, y2) {
            this.blockX1 = x1;
            this.blockY1 = y1;
            this.blockX2 = x2;
            this.blockY2 = y2;
        }
        agi_set_string(strNo, msg) {
            //this.strings[strNo] = message;
        }
        agi_erase(objNo) {
            var obj = this.gameObjects[objNo];
            obj.draw = false;
            this.screen.clearView(obj.oldView, obj.oldLoop, obj.oldCel, obj.oldDrawX, obj.oldDrawY, obj.oldPriority);
            obj.loop = 0;
            obj.cel = 0;
        }
        agi_load_logic(logNo) {
            this.loadedLogics[logNo] = new Agi.LogicParser(this, logNo);
        }
        agi_load_logic_v(varNo) {
            this.agi_load_logic(this.variables[varNo]);
        }
        agi_display(row, col, msg) {
            
            this.screen.bltText(row, col, this.loadedLogics[this.logicNo].logic.messages[msg]);
        }
        agi_display_v(varNo1, varNo2, varNo3) {
            this.agi_display(this.variables[varNo1], this.variables[varNo2], this.variables[varNo3]);
        }
        agi_clear_lines(fromRow, row, colorNo) {
            for (var y = fromRow; y < row + 1; y++) {
                this.screen.bltText(y, 0, "                                        ");
            }
        }
        agi_script_size(bytes) {
        }
        agi_trace_info(logNo, firstRow, height) {
        }
        agi_set_key(num1, num2, num3) {
            console.log("set_key "+num1+" "+num2+" "+num3)
        }
        agi_set_game_id(msg) {
        }
        agi_configure_screen(num1, num2, num3) {
        }
        agi_set_cursor_char(msg) {
        }
        agi_set_menu(msg) {
        }
        agi_set_menu_member(msg, ctrl) {
        }
        agi_submit_menu() {
        }
        agi_enable_member(ctrl) {
        }
        agi_disable_member(ctrl) {
        }
        agi_drop(item) {
            if(!this.pockets) {
                this.pockets = []
            }

            var newPockets = []
            for(var i=0; i<this.pockets.length; i++) {
                if(this.pockets[i] != item) {
                    newPockets[newPockets.length] = this.pockets[i]
                }
            }

            this.pockets = newPockets
        }
        agi_status_line_on() {
        }
        agi_status_line_off() {
        }
        agi_load_sound(soundNo) {
            this.loadedSounds[soundNo] = Resources.readAgiResource(Resources.AgiResource.Sound, soundNo);
            Resources.readAgiResource(Resources.AgiResource.Sound, soundNo)
        }
        agi_sound(soundNo, flagNo) {
            if (this.sound) {
                this.sound.stop();
            }
                            
            this.sound = new Agi.Sound(soundNo, this.loadedSounds[soundNo], flagNo, this.flags[9]);
            this.sound.play(soundNo, flagNo);
        }
        agi_stop_sound() {
            if (this.sound) {
                this.sound.stop();
            }
        }
        agi_reposition(objNo, x, y) {
            var obj = this.gameObjects[objNo];

            this.agi_reposition_to(objNo, obj.x + x, obj.y + y);
        }
        agi_reposition_to(objNo, x, y) {
            var obj = this.gameObjects[objNo];
            this.agi_position(objNo, x, y);
        }
        agi_reposition_to_v(objNo, varNo1, varNo2) {
            this.agi_reposition_to(objNo, this.variables[varNo1], this.variables[varNo2]);
        }
        agi_text_screen() {
        }
        agi_status() {
            if(!this.pockets) this.pockets = []
            
            var inv = "You are carrying:<ul>"

            for(var i=0; i<this.pockets.length; i++) {
                var itm = this.pockets[i]
                inv += "<li>"+ Resources.objects[itm] + "</li>"
            }
            inv += "</ul>"

            if (this.dialogueBox.innerEl.innerHTML != inv) {
                this.dialogueBox.open();
                this.dialogueBox.setText(inv);
            }
        }
        agi_clear_text_rect(n1, n2, n3, n4, n5) {
        }
        agi_menu_input() {
        }
        agi_graphics() {
        }
        agi_show_obj(objNo) {
        }
        agi_show_obj_v(varNo) {
        }
        agi_get(itemNo) {
            if(!this.pockets) {
                this.pockets = []
            }
            this.pockets.push(itemNo)
        }
        agi_discard_sound(n1) {
        }
        agi_save_game() {
            var dialogEl = document.getElementById("savegame")
            var outterEl = (dialogEl) ? dialogEl : document.createElement("div");
            outterEl.id = "savegame"
            outterEl.innerHTML = ""
            var innerEl = document.createElement("div");
            outterEl.appendChild(innerEl);
            document.body.appendChild(outterEl);
            outterEl.style.display = "none";
            outterEl.style.width = "auto";
            outterEl.style.top = "20%";
            outterEl.style.left = "25%";
            outterEl.style.position = "absolute";
            outterEl.style.backgroundColor = "white";
            outterEl.style.padding = "15px";
            outterEl.style.marginRight = "25%";
            outterEl.style.fontSize = "xx-large";
            innerEl.style.display = "block";
            innerEl.style.width = "auto";
            innerEl.style.height = "90%";
            innerEl.style.padding = "15px";
            innerEl.style.fontFamily = "system-ui";
            innerEl.style.fontWeight = "bolder";
            innerEl.style.border = "solid 9px darkred";
            outterEl.style.display = "block";
            innerEl.innerHTML = "Please provide a name for your saved game";            
            var inputEl = document.createElement("input");
            inputEl.id = "savedGameId"
            inputEl.style.display = "block";
            inputEl.style.width = "97%";
            inputEl.style.padding = "10px";
            inputEl.style.marginTop = "23px";
            innerEl.appendChild(inputEl);
            
            var cancelEl = document.createElement("button");
            //cancelEl.style.display = "block";
            cancelEl.style.width = "20%";
            cancelEl.style.padding = "10px";
            cancelEl.style.marginTop = "23px";
            cancelEl.style.marginLeft = "55%";
            cancelEl.innerHTML = "Cancel"
            innerEl.appendChild(cancelEl);
            cancelEl.dialogEl = dialogEl

            cancelEl.addEventListener("click", function() { 
                var dialogEl = document.getElementById("savegame")
                dialogEl.style.display = "none";
            }, true);

            var saveEl = document.createElement("button");
            //saveEl.style.display = "block";
            saveEl.style.width = "20%";
            saveEl.style.padding = "10px";
            saveEl.style.marginTop = "23px";
            saveEl.style.marginLeft = "10px";
            saveEl.innerHTML = "Save"
            innerEl.appendChild(saveEl);            
            saveEl.addEventListener("click", function() { 
                var savedGameName = document.getElementById("savedGameId").value;
                var dialogEl = document.getElementById("savegame")
                dialogEl.style.display = "none";
                var savedGame = {}
                savedGame.flags = Agi.interpreter.flags
                savedGame.variables = Agi.interpreter.variables
                savedGame.pockets = Agi.interpreter.pockets

                var savedGames
                var savedGamesStr = localStorage.getItem("agiGame");
                if(!savedGamesStr) {
                    savedGames = {"games":[]}
                }
                else {
                    savedGames = JSON.parse(savedGamesStr)
                }

                savedGames.games[savedGames.games.length] = { "name": savedGameName, "data": savedGame}

                localStorage.setItem("agiGame", JSON.stringify(savedGames));
            }, true);
            
        }
        agi_restore_game() {
            var gameDataStr = localStorage.getItem("agiGame");
            var gameData = JSON.parse(gameDataStr)

            var dialogEl = document.getElementById("restoregame")
            var outterEl = (dialogEl) ? dialogEl : document.createElement("div");
            outterEl.id = "restoregame"
            outterEl.innerHTML = ""
            var innerEl = document.createElement("div");
            outterEl.appendChild(innerEl);
            document.body.appendChild(outterEl);
            outterEl.style.display = "none";
            outterEl.style.width = "auto";
            outterEl.style.top = "20%";
            outterEl.style.left = "25%";
            outterEl.style.position = "absolute";
            outterEl.style.backgroundColor = "white";
            outterEl.style.padding = "15px";
            outterEl.style.marginRight = "25%";
            outterEl.style.fontSize = "xx-large";
            innerEl.style.display = "block";
            innerEl.style.width = "auto";
            innerEl.style.height = "90%";
            innerEl.style.padding = "15px";
            innerEl.style.fontFamily = "system-ui";
            innerEl.style.fontWeight = "bolder";
            innerEl.style.border = "solid 9px darkred";
            outterEl.style.display = "block";
            
            var cancelEl = document.createElement("button");
            //cancelEl.style.display = "block";
            cancelEl.style.width = "65px";
            cancelEl.style.padding = "10px";
            cancelEl.style.marginTop = "23px";
            cancelEl.style.marginLeft = "55%";
            cancelEl.innerHTML = "Cancel"
            innerEl.appendChild(cancelEl);
            cancelEl.dialogEl = dialogEl

            cancelEl.addEventListener("click", function() { 
                var dialogEl = document.getElementById("restoregame")
                dialogEl.style.display = "none";
            }, true);

            if(!gameData) {
                gameData = { "games": [] }
            }

            innerEl.innerHTML = "Restore Game<br>"

            for(var i=0; i<gameData.games.length; i++) {
                var tableRowEl = document.createElement("tr");
                var tableCol1El = document.createElement("td");
                var tableCol2El = document.createElement("td");
                tableRowEl.appendChild(tableCol1El)
                tableRowEl.appendChild(tableCol2El)

                var restEl = document.createElement("button");
                restEl.style.width = "20%";
                restEl.style.padding = "10px";
                restEl.style.marginTop = "23px";
                restEl.style.marginLeft = "10px";
                restEl.innerHTML = "&nbsp;"

                restEl.gameId = i
                restEl.addEventListener("click", function() {
                    var gameDataStr = localStorage.getItem("agiGame");
                    var gameData = JSON.parse(gameDataStr)
                    var game = gameData.games[this.gameId]
                    game.data.variables[34] = 0
                    Agi.interpreter.new_room = game.data.variables[0] 
                    Agi.interpreter.flags = game.data.flags
                    Agi.interpreter.variables = game.data.variables
                    Agi.interpreter.pockets = game.data.pockets

                    var dialogEl = document.getElementById("restoregame")
                    dialogEl.style.display = "none";
                });
    
                var gameEl = document.createElement("div")
                gameEl.innerHTML = gameData.games[i].name;
                gameEl.style.display = "block";
                gameEl.style.fontSize = "x-large";

                tableCol1El.appendChild(restEl);            
                tableCol2El.appendChild(gameEl)
                innerEl.appendChild(tableRowEl)
            }

            innerEl.appendChild(cancelEl)
        }
        agi_restart_game() {
            window.location.reload() 
        }
        agi_quit(n1) {
        }
        agi_pause() {
        }
        agi_toggle_monitor() {
        }
        agi_init_joy() {
        }
        agi_version() {
        }
        agi_echo_line() {
        }
        agi_cancel_line() {
            //this.inputBuffer = ""
        } // 
        agi_open_dialogue() {
            this.dialogue = true;
            this.dialogueBox.open();
        }
        agi_close_dialogue() {
            this.dialogueBox.close();
        }
        agi_get_string(strNo, msg, x, y, maxLen) {
            this.dialogueStrNo = strNo;
            this.dialoguePrompt = msg;
            this.dialogueStrX = x;
            this.dialogueStrY = y;
            this.dialogueStrLen = maxLen;
            this.dialogueMode = 1;
        }
        agi_parse(strNo) {
        }
        agi_print(msgNo) {
            // this is not the right way to do this but haven't figure out what the right way is
            // where do thes get cleared out -- it should be in the main loop after the response.
            this.flags[2] = false;
            this.inputBuffer = "";
            this.setEgoDir(0);
            var msg = this.loadedLogics[this.logicNo].logic.messages[msgNo];
            msg = msg.replace("%s1", "Philbert"); // need to get the users name and centralize string processing
            this.allowInput = true;
            if (this.dialogueBox.innerEl.innerHTML != msg) {
                this.dialogueBox.open();
                this.dialogueBox.setText(msg);
            }
        }
        agi_print_at_v(varNo) {
            this.agi_print(this.variables[varNo]);
        }
        agi_print_v(varNo) {
            this.agi_print(this.variables[varNo]);
        }
        agi_set_text_attribute(fg, bg) {
        }
        agi_set_scan_start(offset) {
            this.loadedLogics[this.logicNo].scanStart = offset;
        }
        agi_reset_scan_start() {
            this.loadedLogics[this.logicNo].scanStart = 0;
        }
        agi_close_window() {
        }
        /* Tests */
        agi_test_equaln(varNo, val) {
            return this.variables[varNo] == val;

        }
        agi_test_equalv(varNo1, varNo2) {
            return this.agi_test_equaln(varNo1, this.variables[varNo2]);
        }
        agi_test_lessn(varNo, val) {
            return this.variables[varNo] < val;
        }
        agi_test_lessv(varNo1, varNo2) {
            return this.agi_test_lessn(varNo1, this.variables[varNo2]);
        }
        agi_test_greatern(varNo, val) {
            return this.variables[varNo] > val;
        }
        agi_test_greaterv(varNo1, varNo2) {
            return this.agi_test_greatern(varNo1, this.variables[varNo2]);
        }
        agi_test_isset(flagNo) {
            return this.flags[flagNo];
        }
        agi_test_issetv(varNo) {
            return this.agi_test_isset(this.variables[varNo]);
        }
        agi_test_has(itemNo) {
            if(!this.pockets) {
                this.pockets = []
            }

            return (this.pockets.indexOf(itemNo) != -1)
        }
        agi_test_obj_in_room(itemNo, varNo) {
            return false;
        }
        agi_test_posn(objNo, x1, y1, x2, y2) {
            var obj = this.gameObjects[objNo];
            return x1 <= obj.x && obj.x <= x2 && y1 <= obj.y && obj.y <= y2;
        }
        agi_test_controller(ctrNo) {
            return false;
        }
        agi_test_have_key() {
            var haveKey = this.haveKey;
            this.haveKey = false;
            return haveKey;
        }
        agi_log(msg) {
            console.log(msg)
        }
        agi_test_said(wg0, wg1, wg2, wg3, wg4, wg5, wg7, wg8, wg9) {
            // agi_test_said(wordGroups: number[]) {
            // these args should be passed in as an array but they are not
            var wordGroups = [wg0, wg1, wg2, wg3, wg4, wg5, wg7, wg8, wg9];
            wordGroups = wordGroups.filter(v => v !== undefined);
            var said = false;
            if (this.flags[2] == true && this.inputBuffer != "") {
                // The player has entered a command
                // process input according to the spec
                var input = this.inputBuffer;
                // remove all punctuation
                input = input.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
                input = input.replace(/\s{2,}/g, " ");
                // lowercase every thing
                input = input.toLowerCase();
                // break down the input into an array
                var inputWords = input.split(" ");
                // remove group 0 words
                var fillerWords = Resources.words[0];
                for (var fw = 0; fw < fillerWords.length; fw++) {
                    inputWords = inputWords.filter(v => v !== fillerWords[fw]);
                }

                //evaluate the input
                if (wordGroups.length <= inputWords.length) {                    
                    for (var j = 0; j < wordGroups.length; j++) {
                        var wgIdx = wordGroups[j]
                        var words = Resources.words[wgIdx];
                        words = (words) ? words : []

                        var inputWord = inputWords[j];

                        if (words.includes(inputWord) || words.includes("anyword")) {
                            if (j == (inputWords.length - 1)) {
                                said = true;
                                break;
                            }
                        }
                        else { break;}
                    }
                }
                else {
                    this.inputBuffer = ""
                }
            }

            if(said == true) {
                this.flags[2] = true; // The player has entered a command
                this.flags[4] = true; // command accepted
                this.keyboardCharBuffer = [];
                this.inputBuffer = ""
            }

            return said;
        }
        agi_test_compare_strings(strNo1, strNo2) {
            return this.strings[strNo1] == this.strings[strNo2];
        }
        agi_test_obj_in_box(objNo, x1, y1, x2, y2) {
            if(this.gameObjects[objNo].x >= x1 
            && this.gameObjects[objNo].x <= x2
            && this.gameObjects[objNo].y >= y1 
            && this.gameObjects[objNo].y <= y2) {
                return true;
            }      
            else {
                return false;
            }  
        }
        agi_distance(objNo1, objNo2, varNo) {
            var obj1 = this.gameObjects[objNo1];
            var obj2 = this.gameObjects[objNo2];
            if (obj1 != null && obj2 != null && obj1.draw && obj2.draw) {
                this.variables[varNo] = Math.abs(obj1.x - obj2.x) + Math.abs(obj1.y - obj2.y);
            }
            else {
                this.variables[varNo] = 255;
            }
        }
        agi_object_on_land(objNo) {
            this.gameObjects[objNo].allowedSurface = 0
        }
        agi_object_on_water(objNo) {
            this.gameObjects[objNo].allowedSurface = 3
        }
        agi_undefined() {
            // at some point remove this and figure out what is producing this instruction
            // invalid index in opcodes?
        }
    }
    Agi.Interpreter = Interpreter;
})(Agi || (Agi = {}));
var Agi;
(function (Agi) {
    class AstNode {
        constructor(opcode, byteOffset) {
            this.opcode = opcode;
            this.byteOffset = byteOffset;
        }
    }
    class Scope {
        constructor() {
            this.body = [];
        }
    }
    class ExpressionNode extends AstNode {
        eval(interpreter) {
            throw "Cannot invoke ExpressionNode directly";
        }
    }
    class BinaryNode extends ExpressionNode {
    }
    class AndNode extends BinaryNode {
        eval(interpreter) {
            var left = this.left.eval(interpreter);
            var right = this.right.eval(interpreter);
            return left && right;
        }
    }
    class OrNode extends BinaryNode {
        eval(interpreter) {
            var left = this.left.eval(interpreter);
            var right = this.right.eval(interpreter);
            return left || right;
        }
    }
    class TestNode extends ExpressionNode {
        constructor(opcode, byteOffset) {
            super(opcode, byteOffset);
            this.negate = false;
        }
        eval(interpreter) {
            var result = this.test.apply(interpreter, this.args);
            return this.negate ? !result : result;
        }
    }
    class StatementNode extends AstNode {
        constructor(opcode, byteOffset, statement) {
            super(opcode, byteOffset);
            this.statement = statement;
        }
        execute(interpreter) {
            this.statement.apply(interpreter, this.args);
        }
    }
    class IfNode extends AstNode {
        constructor(byteOffset) {
            super(0xFF, byteOffset);
            this.then = new Scope();
        }
    }
    class GotoNode extends AstNode {
        constructor(byteOffset, offset) {
            super(0xFE, byteOffset);
            this.offset = offset;
        }
    }
    class ReturnNode extends AstNode {
        constructor(byteOffset) {
            super(0x00, byteOffset);
        }
    }
    class LogicParser {
        constructor(interpreter, no) {
            this.interpreter = interpreter;
            this.no = no;
            this.decryptionKey = "Avis Durgan";
            this.loadLogic(no);
        }
        readUint8() {
            return this.logic.data.readUint8();
        }
        readUint16() {
            return this.logic.data.readUint16();
        }
        readInt16() {
            return this.logic.data.readInt16();
        }
        jumpRelative(offset) {
            this.logic.data.position += offset;
        }
        loadLogic(no) {
            this.logic = new Agi.Logic(no, Resources.readAgiResource(Resources.AgiResource.Logic, no));
            var messageOffset = this.readUint16();            
            this.logic.data.position += messageOffset;
            var pos = this.logic.data.position;
            this.messagesStartOffset = pos;
            var numMessages = this.readUint8();
            var ptrMessagesEnd = this.readUint16();
            var decryptionIndex = 0;
                
            for (var i = 0; i < numMessages; i++) {
                var msgPtr = this.readUint16();
                if (msgPtr == 0)
                    continue;
                var mpos = this.logic.data.position;
                this.logic.data.position = pos + msgPtr + 1;
                var msg = "";
                var backstop = 0
                while (true) {
                    var decrypted = String.fromCharCode(this.decryptionKey[decryptionIndex++].charCodeAt(0) ^ this.readUint8());
                    if (decryptionIndex >= this.decryptionKey.length)
                        decryptionIndex = 0;
                    if (decrypted == '\0')
                        break;
                    msg += decrypted;
                    backstop++ 
                    if(backstop>10000)break;
                }
                this.logic.messages[i + 1] = msg;
                this.logic.data.position = mpos;
            }

            this.logic.data.position = pos - messageOffset;
            this.scanStart = this.entryPoint = this.logic.data.position;
        }
        decompile() {
            var program = new Scope();
            var scope = program;
            var scopeStack = [];
            var currentIfNode;
            var lastGotoOffset = 0;
            this.logic.data.position = this.scanStart;
            while (this.logic.data.position < this.messagesStartOffset) {
                while (scope.endOffset > 0 && this.logic.data.position == scope.endOffset) {
                    if (scopeStack.length > 0)
                        scope = scopeStack.pop();
                    else
                        scope.endOffset = 0;
                }
                var opcode = this.readUint8();
                if (opcode == 0xFF) {
                    currentIfNode = new IfNode(this.logic.data.position);
                    scope.body.push(currentIfNode);
                    var expressionStack = [];
                    var or = false;
                    while (true) {
                        var negate = false;
                        opcode = this.readUint8();
                        if (opcode == 0xFF)
                            break;
                        else if (opcode == 0xFC) {
                            or = !or;
                            continue;
                        }
                        else if (opcode == 0xFD) {
                            negate = true;
                            opcode = this.readUint8();
                        }
                        var funcName = LogicParser.tests[opcode - 1];
                        var test = this.interpreter["agi_test_" + funcName];
                        var args = [];
                        var numArgs = test.length;
                        if (opcode == 0x0E) {
                            numArgs = this.readUint8() * 2;
                        }
                        for (var i = 0; i < numArgs; i++) {
                            var arg = this.readUint8();
                            args.push(arg);
                        }
                        var testNode = new TestNode(opcode, this.logic.data.position);
                        testNode.opcode = opcode;
                        testNode.args = args;
                        testNode.negate = negate;
                        expressionStack.push(testNode);
                        if (expressionStack.length == 2) {
                            var bn;
                            if (or)
                                bn = new OrNode(opcode, this.logic.data.position);
                            else {
                                bn = new AndNode(opcode, this.logic.data.position);
                            }
                            bn.right = expressionStack.pop();
                            bn.left = expressionStack.pop();
                            expressionStack.push(bn);
                        }
                    }
                    currentIfNode.expression = expressionStack.pop();
                    currentIfNode.then = new Scope();
                    scopeStack.push(scope);
                    scope = currentIfNode.then;
                    scope.endOffset = this.logic.data.position + this.readUint16() + 2;
                }
                else if (opcode == 0xFE) {
                    var rel = this.readInt16();
                    var offset = this.logic.data.position + rel;
                    if (rel < 0) {
                        scope.body.push(new GotoNode(this.logic.data.position, offset));
                        lastGotoOffset = this.logic.data.position;
                    }
                    else {
                        currentIfNode.else = new Scope();
                        scope = currentIfNode.else;
                        scope.endOffset = offset;
                    }
                }
                else {
                    if (opcode == 0x00) {
                        scope.body.push(new ReturnNode(this.logic.data.position));
                        continue;
                    }
                    funcName = LogicParser.statements[opcode];
                    var statement = this.interpreter["agi_" + funcName];
                    var args = [];
                    for (var i = 0; i < statement.length; i++) {
                        var arg = this.readUint8();
                        args.push(arg);
                    }
                    scope.body.push(new StatementNode(opcode, this.logic.data.position, statement));
                }
            }
 
            return program;
        }
        parseLogic() {
            var orMode = false;
            var invertMode = false;
            var testMode = false;
            var testResult = true;
            var debugLine = "";
            var orResult = false;
            var funcName;
            var test;
            var statement;
            var args;
            this.logic.data.position = this.scanStart;
            while (true) {
                var opCodeNr = this.readUint8();
                if (opCodeNr == 0x00) {
                    //console.log("L" + this.logic.no + ": " + "return");
                    break;
                }
                else if (opCodeNr == 0x91) {
                    // set.scan.start
                    this.scanStart = this.logic.data.position + 1;
                }
                else if (opCodeNr == 0x92) {
                    // reset.scan.start
                    this.scanStart = this.entryPoint;
                }
                else if (opCodeNr == 0xFE) {
                    var n1 = this.readUint8();
                    var n2 = this.readUint8();
                    var offset = (((n2 << 8) | n1) << 16) >> 16;
                    this.jumpRelative(offset);
                    //console.log("L" + this.logic.no + ": " + "goto " + offset);
                }
                else if (opCodeNr == 0xFF) {
                    if (testMode) {
                        testMode = false;
                        // Evaluate last test
                        var elseOffset = this.readUint16();
                        if (testResult != true) {
                            //console.log(debugLine + ") = F");
                            this.jumpRelative(elseOffset);
                        }
                        else {
                            //console.log(debugLine + ") = T");
                        }
                    }
                    else {
                        debugLine = "if(";
                        invertMode = false;
                        orMode = false;
                        testResult = true;
                        orResult = false;
                        testMode = true;
                    }
                }
                else if (testMode) {
                    if (opCodeNr == 0xFC) {
                        orMode = !orMode;
                        if (orMode === true)
                            orResult = false;
                        else {
                            testResult = testResult && orResult;
                        }
                    }
                    else if (opCodeNr == 0xFD)
                        invertMode = !invertMode;
                    else {
                        funcName = LogicParser.tests[opCodeNr - 1];
                        test = this.interpreter["agi_test_" + funcName];
                        args = [];
                        var argLen = test.length;
                        if (opCodeNr == 0x0E) { // Said, variable nr of arguments
                            argLen = this.readUint8();
                            for (var i = 0; i < argLen; i++) {
                                args.push(this.readUint16());
                            }
                        }
                        else {
                            for (var i = 0; i < argLen; i++) {
                                args.push(this.readUint8());
                            }
                        }
                        var result = test.apply(this.interpreter, args);
                        if (testResult == null)
                            debugLine += funcName;
                        else {
                            debugLine += (orMode ? " || " : " && ") + funcName;
                        }
                        if (invertMode) {
                            result = !result;
                            invertMode = false;
                        }
                        if (orMode) {
                            orResult = orResult || result;
                        }
                        else {
                            testResult = testResult && result;
                        }
                    }
                }
                else {
                    funcName = LogicParser.statements[opCodeNr];
                    //console.log(funcName);
                    statement = this.interpreter["agi_" + funcName];
                    if (statement === undefined)
                        throw "Statement not implemented: " + funcName;
                    debugLine = funcName;
                    args = [];
                    for (var i = 0; i < statement.length; i++) {
                        args.push(this.readUint8());
                    }
 
                    //console.log(LogicParser.stNo + " @L" + this.logic.no + ": " + debugLine+" : "+args);
 
                    statement.apply(this.interpreter, args);
                    LogicParser.stNo++;
                    if (opCodeNr == 0x12) // new.room
                     {
                        this.logic.data.position = 0;
                        break;
                    }
                }
            }
        }
    }
    LogicParser.tests = [
        "equaln",
        "equalv",
        "lessn",
        "lessv",
        "greatern",
        "greaterv",
        "isset",
        "issetv",
        "has",
        "obj_in_room",
        "posn",
        "controller",
        "have_key",
        "said",
        "compare_strings",
        "obj_in_box",
        "center_posn",
        "right_posn"
    ];
    LogicParser.statements = [
        "return",
        "increment",
        "decrement",
        "assignn",
        "assignv",
        "addn",
        "addv",
        "subn",
        "subv",
        "lindirectv",
        "rindirect",
        "lindirectn",
        "set",
        "reset",
        "toggle",
        "set_v",
        "reset_v",
        "toggle_v",
        "new_room",
        "new_room_v",
        "load_logic",
        "load_logic_v",
        "call",
        "call_v",
        "load_pic",
        "draw_pic",
        "show_pic",
        "discard_pic",
        "overlay_pic",
        "show_pri_screen",
        "load_view",
        "load_view_v",
        "discard_view",
        "animate_obj",
        "unanimate_all",
        "draw",
        "erase",
        "position",
        "position_v",
        "get_posn",
        "reposition",
        "set_view",
        "set_view_v",
        "set_loop",
        "set_loop_v",
        "fix_loop",
        "release_loop",
        "set_cel",
        "set_cel_v",
        "last_cel",
        "current_cel",
        "current_loop",
        "current_view",
        "number_of_loops",
        "set_priority",
        "set_priority_v",
        "release_priority",
        "get_priority",
        "stop_update",
        "start_update",
        "force_update",
        "ignore_horizon",
        "observe_horizon",
        "set_horizon",
        "object_on_water",
        "object_on_land",
        "object_on_anything",
        "ignore_objs",
        "observe_objs",
        "distance",
        "stop_cycling",
        "start_cycling",
        "normal_cycle",
        "end_of_loop",
        "reverse_cycle",
        "reverse_loop",
        "cycle_time",
        "stop_motion",
        "start_motion",
        "step_size",
        "step_time",
        "move_obj",
        "move_obj_v",
        "follow_ego",
        "wander",
        "normal_motion",
        "set_dir",
        "get_dir",
        "ignore_blocks",
        "observe_blocks",
        "block",
        "unblock",
        "get",
        "get_v",
        "drop",
        "put",
        "put_v",
        "get_room_v",
        "load_sound",
        "sound",
        "stop_sound",
        "print",
        "print_v",
        "display",
        "display_v",
        "clear_lines",
        "text_screen",
        "graphics",
        "set_cursor_char",
        "set_text_attribute",
        "shake_screen",
        "configure_screen",
        "status_line_on",
        "status_line_off",
        "set_string",
        "get_string",
        "word_to_string",
        "parse",
        "get_num",
        "prevent_input",
        "accept_input",
        "set_key",
        "add_to_pic",
        "add_to_pic_v",
        "status",
        "save_game",
        "restore_game",
        "init_disk",
        "restart_game",
        "show_obj",
        "random",
        "program_control",
        "player_control",
        "obj_status_v",
        "quit",
        "show_mem",
        "pause",
        "echo_line",
        "cancel_line",
        "init_joy",
        "toggle_monitor",
        "version",
        "script_size",
        "set_game_id",
        "log",
        "set_scan_start",
        "reset_scan_start",
        "reposition_to",
        "reposition_to_v",
        "trace_on",
        "trace_info",
        "print_at",
        "print_at_v",
        "discard_view_v",
        "clear_text_rect",
        "set_upper_left",
        "set_menu",
        "set_menu_member",
        "submit_menu",
        "enable_member",
        "disable_member",
        "menu_input",
        "show_obj_v",
        "open_dialogue",
        "close_dialogue",
        "mul_n",
        "mul_v",
        "div_n",
        "div_v",
        "close_window",
        "set_simple",
        "push_script",
        "pop_script",
        "hold_key",
        "set_pri_base",
        "discard_sound",
        "hide_mouse",
        "allow_menu",
        "show_mouse",
        "fence_mouse",
        "mouse_posn",
        "release_key",
        "adj_ego_move_to_xy"
    ];
    LogicParser.stNo = 0;
    Agi.LogicParser = LogicParser;
})(Agi || (Agi = {}));
var Resources;
(function (Resources) {
    var logdirRecords = [], picdirRecords = [], viewdirRecords = [], snddirRecords = [];
    var volBuffers = [];
    var availableVols = [];
    Resources.words = [];
    function parseDirfile(buffer, records) {
        var length = buffer.length / 3;
        for (var i = 0; i < length; i++) {
             var a = buffer.readUint8()
            var b = buffer.readUint8()
            var c = buffer.readUint8()

            var val = (a << 16) + (b << 8) + c;
            
            var volNo = val >>> 20;
            var volOffset = val & 0xFFFFF;
            if (val >>> 16 == 0xFF)
                continue;

            records[i] = { volNo: volNo, volOffset: volOffset };
            if (availableVols[volNo] === undefined)
                availableVols[volNo] = true;
        }
    }
    function parseObjectFile(buffer) {

        var objectNameOffset = 42 //buffer.readUint16();
        var objectNames = []
        var objectName = ""
        var decryptionIndex = 0
        var decryptionKey = 'Avis Durgan'
        buffer.position = 42
        for(var i=objectNameOffset; i<buffer.length; i++) {
            var charAsNum = buffer.readUint8();
            if(charAsNum != 0x00) {
                var decrypted = String.fromCharCode(decryptionKey[decryptionIndex++].charCodeAt(0) ^ charAsNum);
                objectName += decrypted
            }
            else {
               objectNames[objectNames.length] = objectName
               objectName = "" 
            }

            if (decryptionIndex == decryptionKey.length) decryptionIndex = 0;
        }
        if (decryptionIndex == decryptionKey.length) decryptionIndex = 0;
        return objectNames
    }
    function parseWordFile(buffer) {
        buffer.position = 52;
        let words = [];
        let previousWord = "";
        let currentWord = "";
        let bytesRead = 0;
        while (true) {
            previousWord = currentWord;
            currentWord = '';
            if (bytesRead >= buffer.length)
                break;
            var byteIn = buffer.readUint8(true);
            bytesRead++;
            currentWord = previousWord.substring(0, byteIn);
            while (true) {
                if (bytesRead >= buffer.length)
                    break;
                var byteIn = buffer.readUint8(true);
                bytesRead++;
                if (byteIn < 32) {
                    currentWord += String.fromCharCode(byteIn ^ 127);
                }
                else if (byteIn == 95) {
                    currentWord += " ";
                }
                else if (byteIn > 127) {
                    currentWord += String.fromCharCode((byteIn - 128) ^ 127);
                    break;
                }
            }
            var wordNoLo = buffer.readUint8(true);
            var wordNoHi = buffer.readUint8(true);
            var wordblockNum = wordNoLo * 256 + wordNoHi;
            if (wordblockNum > 10000)
                wordblockNum = 0;
            bytesRead += 2;
            if (!isNaN(wordblockNum)) {
                if (words[wordblockNum]) {
                    words[wordblockNum].push(currentWord);
                }
                else {
                    words[wordblockNum] = [];
                    words[wordblockNum].push(currentWord);
                }
            }
        }
        return words;
    }
    let AgiResource;
    (function (AgiResource) {
        AgiResource[AgiResource["Logic"] = 0] = "Logic";
        AgiResource[AgiResource["Pic"] = 1] = "Pic";
        AgiResource[AgiResource["View"] = 2] = "View";
        AgiResource[AgiResource["Sound"] = 3] = "Sound";
    })(AgiResource = Resources.AgiResource || (Resources.AgiResource = {}));
    function readAgiResource(type, num) {
        var record = null;
        switch (type) {
            case AgiResource.Logic:
                record = logdirRecords[num];
                break;
            case AgiResource.Pic:
                record = picdirRecords[num];
                break;
            case AgiResource.View:
                record = viewdirRecords[num];
                break;
            case AgiResource.Sound:
                record = snddirRecords[num];
                break;
            default:
                throw "Undefined resource type: " + type;
        }
        if(record) {
            var volstream = new Fs.ByteStream(volBuffers[record.volNo].buffer, record.volOffset);
            var sig = volstream.readUint16();
            var volNo = volstream.readUint8();
            var resLength = volstream.readUint16();
            var volPart = new Fs.ByteStream(volstream.buffer, record.volOffset + 5, record.volOffset + 5 + resLength);
            return volPart;
    
        }
    }
    Resources.readAgiResource = readAgiResource;
    function load(path, done) {
        Fs.downloadAllFiles(path, ["logdir", "picdir", "viewdir", "snddir"], (buffers) => {
            parseDirfile(buffers["logdir"], logdirRecords);
            parseDirfile(buffers["picdir"], picdirRecords);
            parseDirfile(buffers["viewdir"], viewdirRecords);
            parseDirfile(buffers["snddir"], snddirRecords);
            var volNames = [];
            for (var i = 0; i < availableVols.length; i++) {
                if (availableVols[i] === true) {
                    volNames.push("vol." + i);
                }
            }
            Fs.downloadAllFiles(path, volNames, (buffers) => {
                for (var j = 0; j < volNames.length; j++) {
                    volBuffers[j] = buffers[volNames[j]];
                }
                // fonts don't come with the games. Maybe there should be a call for system files?
                // assume they are a folder up?
                var fontPath = path.endsWith("/") ? path.substring(0, path.length - 1) : path; // remove trailing slash
                fontPath = fontPath.substring(0, fontPath.lastIndexOf("/") + 1); // remove last folder 
                Fs.downloadAllFiles(fontPath, ["font.bin"], (buffers) => {
                    Resources.fontStream = buffers["font.bin"];
                    done();
                });
                // WORDS.TOK
                Fs.downloadAllFiles(path, ["words.tok"], (buffers) => {
                    var wordsStream = buffers["words.tok"];
                    Resources.words = parseWordFile(wordsStream);
                    done();
                });

                // OBJECT
                Fs.downloadAllFiles(path, ["object"], (buffers) => {
                    var objectStream = buffers["object"];
                    Resources.objects = parseObjectFile(objectStream);
                    done();
                });
                
            });
        });
    }
    Resources.load = load;
})(Resources || (Resources = {}));
var Agi;
(function (Agi) {
    class Screen {
        /**
         *
         */
        constructor(interpreter) {
            this.interpreter = interpreter;
        }
        bltText(row, col, text) {
            var fontStream = Resources.fontStream;
            var sRegex = /\%s(\d+)/;
            var regexResult;
            while ((regexResult = sRegex.exec(text)) !== null) {
                text = text.slice(0, regexResult.index) + this.interpreter.strings[parseInt(regexResult[1])] + text.slice(regexResult.index + regexResult.length + 1);
            }
            for (var i = 0; i < text.length; i++) {
                var chr = text[i].charCodeAt(0);
                if (chr == 10) {
                    row++;
                    col = 0;
                    continue;
                }
                fontStream.position = chr * 8;
                var data = this.interpreter.frameData.data;
                for (var y = 0; y < 8; y++) {
                    var colData = fontStream.readUint8();
                    for (var x = 0; x < 8; x++) {
                        var color = 0x00;
                        if ((colData & 0x80) == 0x80)
                            color = 0xFF;
                        var idx = (row * 8 + y) * 320 + (col * 8 + x);
                        data[idx * 4 + 0] = color;
                        data[idx * 4 + 1] = color;
                        data[idx * 4 + 2] = color;
                        data[idx * 4 + 3] = 0xFF;
                        colData = colData << 1;
                    }
                }
                col++;
                if (col >= 40) {
                    col = 0;
                    row++;
                }
            }
        }
        bltPic() {
            var data = this.interpreter.frameData.data;
            for (var k = 0; k < Agi.Bitmap.width * Agi.Bitmap.height; k++) {
                this.interpreter.framePriorityData.data[k] = this.interpreter.priorityBuffer.data[k];
                var rgb = Agi.palette[this.interpreter.visualBuffer.data[k]];
                data[k * 8 + 0] = (rgb >>> 16) & 0xFF;
                data[k * 8 + 1] = (rgb >>> 8) & 0xFF;
                data[k * 8 + 2] = rgb & 0xFF;
                data[k * 8 + 3] = 255;
                data[k * 8 + 4] = (rgb >>> 16) & 0xFF;
                data[k * 8 + 5] = (rgb >>> 8) & 0xFF;
                data[k * 8 + 6] = rgb & 0xFF;
                data[k * 8 + 7] = 255;
            }
        }
        clearView(viewNo, loopNo, celNo, x, y, priority) {
            try{
            var view = this.interpreter.loadedViews[viewNo];
            var cel = view.loops[loopNo].cels[celNo];
            var mirror = cel.mirrored;
            if (cel.mirrored) {
                cel = view.loops[cel.mirroredLoop].cels[celNo];
            }
            var data = this.interpreter.frameData.data;
            for (var cy = 0; cy < cel.height; cy++) {
                if (cy + y - cel.height >= 200)
                    break;
                for (var cx = 0; cx < cel.width; cx++) {
                    if (cx + x >= 160)
                        break;
                    var idx = (cy + y + 1 - cel.height) * 160 + (cx + x);
                    if (priority < this.interpreter.framePriorityData.data[idx])
                        continue;
                    var ccx = cx;
                    if (mirror)
                        ccx = cel.width - cx - 1;
                    var color = cel.pixelData[cy * cel.width + ccx];
                    if (color == cel.transparentColor)
                        continue;
                    color = this.interpreter.visualBuffer.data[idx];
                    this.interpreter.framePriorityData.data[idx] = this.interpreter.priorityBuffer.data[idx];
                    var rgb = Agi.palette[color];
                    data[idx * 8 + 0] = (rgb >>> 16) & 0xFF;
                    data[idx * 8 + 1] = (rgb >>> 8) & 0xFF;
                    data[idx * 8 + 2] = rgb & 0xFF;
                    data[idx * 8 + 3] = 255;
                    data[idx * 8 + 4] = (rgb >>> 16) & 0xFF;
                    data[idx * 8 + 5] = (rgb >>> 8) & 0xFF;
                    data[idx * 8 + 6] = rgb & 0xFF;
                    data[idx * 8 + 7] = 255;
                }
            }
        }
            catch(err){
               // console.log(err)
            }
        }
        bltView(viewNo, loopNo, celNo, x, y, priority) {

            try{
            var view = this.interpreter.loadedViews[viewNo];
            var cel = view.loops[loopNo].cels[celNo];
            var mirror = cel.mirrored;
            if (cel.mirrored) {
                cel = view.loops[cel.mirroredLoop].cels[celNo];
            }
            var data = this.interpreter.frameData.data;
            for (var cy = 0; cy < cel.height; cy++) {
                if (cy + y - cel.height >= 200)
                    break;
                for (var cx = 0; cx < cel.width; cx++) {
                    if (cx + x >= 160)
                        break;
                    var idx = (cy + y + 1 - cel.height) * 160 + (cx + x);
                    if (priority < this.interpreter.framePriorityData.data[idx])
                        continue;
                    var ccx = cx;
                    if (mirror)
                        ccx = cel.width - cx - 1;
                    var color = cel.pixelData[cy * cel.width + ccx];
                    if (color == cel.transparentColor)
                        continue;
                    this.interpreter.framePriorityData.data[idx] = priority;
                    var rgb = Agi.palette[color];
                    data[idx * 8 + 0] = (rgb >>> 16) & 0xFF;
                    data[idx * 8 + 1] = (rgb >>> 8) & 0xFF;
                    data[idx * 8 + 2] = rgb & 0xFF;
                    data[idx * 8 + 3] = 255;
                    data[idx * 8 + 4] = (rgb >>> 16) & 0xFF;
                    data[idx * 8 + 5] = (rgb >>> 8) & 0xFF;
                    data[idx * 8 + 6] = rgb & 0xFF;
                    data[idx * 8 + 7] = 255;
                }
            }
        }catch(err) {
           console.log(err)
        }
        }
        drawObject(obj, no) {
            if (obj.redraw || obj.oldView != obj.viewNo || obj.oldLoop != obj.loop || obj.oldCel != obj.cel || obj.oldDrawX != obj.x || obj.oldDrawY != obj.y || obj.oldPriority != obj.priority) {
                obj.redraw = false;
                this.clearView(obj.oldView, obj.oldLoop, obj.oldCel, obj.oldDrawX, obj.oldDrawY, obj.oldPriority);
                this.bltView(obj.viewNo, obj.loop, obj.cel, obj.x, obj.y, obj.priority);
            }
            obj.oldDrawX = obj.x;
            obj.oldDrawY = obj.y;
            obj.oldView = obj.viewNo;
            obj.oldLoop = obj.loop;
            obj.oldCel = obj.cel;
            obj.oldPriority = obj.priority;
        }
    }
    Agi.Screen = Screen;
})(Agi || (Agi = {}));
//# sourceMappingURL=agi.js.map