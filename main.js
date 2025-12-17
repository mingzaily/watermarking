var $ = function(sel) {
    return document.querySelector(sel);
};

var inputItems = ['text', 'color', 'alpha', 'angle', 'space', 'size', 'inline'];
var input = {};

var image = $('#image');
var graph = $('#graph');
var refresh = $('#refresh');
var autoRefresh = $('#auto-refresh');
var colorChip = $('#color-chip');
var valueDisplays = {
    color: $('#color-value'),
    alpha: $('#alpha-value'),
    angle: $('#angle-value'),
    space: $('#space-value'),
    size: $('#size-value'),
    inline: $('#inline-value')
};
var file = null;
var canvas = null;
var textCtx = null;
var repaint = null;
var presetButtons = document.querySelectorAll('[data-color-preset]');
var watermarkImg = null;
var watermarkImageInput = $('#watermark-image');
var textWatermarkDiv = $('#text-watermark');
var imageWatermarkDiv = $('#image-watermark');

var dataURItoBlob = function(dataURI) {
    var binStr = atob(dataURI.split(',')[1]);
    var len = binStr.length;
    var arr = new Uint8Array(len);

    for (var i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
    }

    return new Blob([arr], { type: 'image/png' });
};

var generateFileName = function() {
    var pad = function(n) {
        return n < 10 ? '0' + n : n;
    };

    var d = new Date();
    return '' + d.getFullYear() + (pad(d.getMonth() + 1)) + (pad(d.getDate())) + '-' + (pad(d.getHours())) + (pad(d.getMinutes())) + (pad(d.getSeconds())) + '.png';
};

var readFile = function() {
    if (!file) return;

    console.log("read a file!")

    var fileReader = new FileReader();

    fileReader.onload = function() {
        var img = new Image();
        img.onload = function() {
            canvas = document.createElement('canvas');
            canvas.className = 'max-w-full max-h-[60vh] cursor-pointer rounded border border-notion-border';
            canvas.width = img.width;
            canvas.height = img.height;
            textCtx = null;

            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            repaint = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };

            drawWatermark();

            graph.innerHTML = '';
            graph.appendChild(canvas);
            $('#download').removeAttribute('disabled');

            canvas.addEventListener('click', function() {
                var link = document.createElement('a');
                link.download = generateFileName();
                var imageData = canvas.toDataURL('image/png');
                var blob = dataURItoBlob(imageData);
                link.href = URL.createObjectURL(blob);
                graph.appendChild(link);

                setTimeout(function() {
                    link.click();
                    graph.removeChild(link);
                }, 100);
            });
        };
        img.src = fileReader.result;
    };
    fileReader.readAsDataURL(file);
};

var makeStyle = function() {
    var match = input.color.value.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);

    return 'rgba(' + (parseInt(match[1], 16)) + ',' + (parseInt(match[2], 16)) + ',' + (parseInt(match[3], 16)) + ',' + input.alpha.value + ')';
};

var getPosition = function() {
    var checked = document.querySelector('input[name="position"]:checked');
    return checked ? checked.value : 'tile';
};

var getWatermarkType = function() {
    var checked = document.querySelector('input[name="watermark-type"]:checked');
    return checked ? checked.value : 'text';
};

var drawWatermark = function() {
    var type = getWatermarkType();
    if (type === 'text') {
        drawText();
    } else {
        drawImageWatermark();
    }
};

var drawImageWatermark = function() {
    if (!canvas || !watermarkImg) return;
    var position = getPosition();
    var scale = input.size.value;
    var alpha = parseFloat(input.alpha.value);

    if (textCtx) {
        repaint();
    } else {
        textCtx = canvas.getContext('2d');
    }

    textCtx.save();
    textCtx.globalAlpha = alpha;

    var imgW = watermarkImg.width * scale * 0.1;
    var imgH = watermarkImg.height * scale * 0.1;
    var padding = Math.min(canvas.width, canvas.height) * 0.02;

    if (position === 'tile') {
        var inlineSpacing = parseFloat(input.inline ? input.inline.value : 1);
        var spacingX = imgW * (1 + inlineSpacing);
        var spacingY = imgH * input.space.value;

        textCtx.translate(canvas.width / 2, canvas.height / 2);
        textCtx.rotate(input.angle.value * Math.PI / 180);

        var step = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
        var countX = Math.ceil(step / spacingX);
        var countY = Math.ceil(step / spacingY);

        for (var i = -countX; i <= countX; i++) {
            for (var j = -countY; j <= countY; j++) {
                textCtx.drawImage(watermarkImg, i * spacingX - imgW/2, j * spacingY - imgH/2, imgW, imgH);
            }
        }
    } else {
        var tx, ty;
        switch (position) {
            case 'top-left':
                tx = padding; ty = padding;
                break;
            case 'top-right':
                tx = canvas.width - imgW - padding; ty = padding;
                break;
            case 'bottom-left':
                tx = padding; ty = canvas.height - imgH - padding;
                break;
            case 'bottom-right':
                tx = canvas.width - imgW - padding; ty = canvas.height - imgH - padding;
                break;
            case 'center':
                tx = (canvas.width - imgW) / 2; ty = (canvas.height - imgH) / 2;
                break;
        }
        textCtx.drawImage(watermarkImg, tx, ty, imgW, imgH);
    }

    textCtx.restore();
};

var drawText = function() {
    if (!canvas) return;
    if (!input.text.value) return;
    var textSize = input.size.value * Math.max(15, (Math.min(canvas.width, canvas.height) / 25));
    var inlineSpacing = parseFloat(input.inline ? input.inline.value : 1);
    var position = getPosition();

    if (textCtx) {
        repaint();
    } else {
        textCtx = canvas.getContext('2d');
    }

    textCtx.save();
    textCtx.fillStyle = makeStyle();
    textCtx.font = 'bold ' + textSize + 'px -apple-system,"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","WenQuanYi Micro Hei",sans-serif';

    var width = textCtx.measureText(input.text.value).width;
    var padding = textSize * 0.5;

    if (position === 'tile') {
        var centerX = canvas.width / 2;
        var centerY = canvas.height / 2;
        textCtx.translate(centerX, centerY);
        textCtx.rotate(input.angle.value * Math.PI / 180);

        var step = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
        var margin = inlineSpacing * textCtx.measureText('啊').width;
        var x = Math.ceil(step / (width + margin));
        var y = Math.ceil((step / (input.space.value * textSize)) / 2);

        for (var i = -x; i < x; i++) {
            for (var j = -y; j <= y; j++) {
                textCtx.fillText(input.text.value, (width + margin) * i, input.space.value * textSize * j);
            }
        }
    } else {
        textCtx.rotate(input.angle.value * Math.PI / 180);
        var tx, ty;
        switch (position) {
            case 'top-left':
                tx = padding; ty = padding + textSize;
                break;
            case 'top-right':
                tx = canvas.width - width - padding; ty = padding + textSize;
                break;
            case 'bottom-left':
                tx = padding; ty = canvas.height - padding;
                break;
            case 'bottom-right':
                tx = canvas.width - width - padding; ty = canvas.height - padding;
                break;
            case 'center':
                tx = (canvas.width - width) / 2; ty = (canvas.height + textSize) / 2;
                break;
        }
        textCtx.setTransform(1, 0, 0, 1, 0, 0);
        textCtx.fillStyle = makeStyle();
        textCtx.font = 'bold ' + textSize + 'px -apple-system,"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","WenQuanYi Micro Hei",sans-serif';
        textCtx.fillText(input.text.value, tx, ty);
    }

    textCtx.restore();
};

var setDisplayValue = function(key) {
    var display = valueDisplays[key];
    if (!display) return;
    var value = input[key].value;

    switch (key) {
        case 'alpha':
            display.textContent = Math.round(value * 100) + '%';
            break;
        case 'angle':
            display.textContent = value + '°';
            break;
        case 'space':
            display.textContent = parseFloat(value).toFixed(1) + '×';
            break;
        case 'size':
            display.textContent = parseFloat(value).toFixed(1) + '×';
            break;
        case 'inline':
            display.textContent = parseFloat(value).toFixed(1) + '×';
            break;
        case 'color':
            var hex = value.toUpperCase();
            if (hex.charAt(0) !== '#') hex = '#' + hex;
            display.textContent = hex;
            if (colorChip) {
                colorChip.style.background = hex;
            }
            break;
        default:
            display.textContent = value;
    }
};

var validTypes = {'image/png': 1, 'image/jpeg': 1, 'image/gif': 1};

var handleFile = function(f) {
    if (!(f.type in validTypes)) {
        return alert('仅支持 png, jpg, gif 图片格式');
    }
    file = f;
    readFile();
};

image.addEventListener('change', function() {
    if (this.files[0]) handleFile(this.files[0]);
});

// 拖拽上传
var dropZone = $('#drop-zone');
dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', function() {
    this.classList.remove('drag-over');
});
dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

// 粘贴上传
document.addEventListener('paste', function(e) {
    var items = e.clipboardData.items;
    for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            handleFile(items[i].getAsFile());
            break;
        }
    }
});

inputItems.forEach(function(item) {
    var el = $('#' + item);
    input[item] = el;
    setDisplayValue(item);

    autoRefresh.addEventListener('change', function() {
        if (this.checked) {
            refresh.setAttribute('disabled', 'disabled');
        } else {
            refresh.removeAttribute('disabled');
        }
    });

    el.addEventListener('input', function() {
        setDisplayValue(item);
        if (autoRefresh.checked) drawWatermark();
    });

    refresh.addEventListener('click', drawWatermark);
});

presetButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
        var colorValue = this.getAttribute('data-color-preset');
        if (!input.color) return;
        input.color.value = colorValue;
        var event = new Event('input', { bubbles: true });
        input.color.dispatchEvent(event);
    });
});

// 位置选择
var updateControlsState = function() {
    var isTile = getPosition() === 'tile';
    var isText = getWatermarkType() === 'text';
    ['#angle-control', '#space-control', '#inline-control'].forEach(function(sel) {
        var el = $(sel);
        if (el) el.classList.toggle('control-disabled', !isTile);
    });
    var colorCtrl = $('#color-control');
    if (colorCtrl) colorCtrl.classList.toggle('control-disabled', !isText);
};

document.querySelectorAll('input[name="position"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        updateControlsState();
        if (autoRefresh.checked) drawWatermark();
    });
});

// 水印类型切换
document.querySelectorAll('input[name="watermark-type"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
        if (this.value === 'text') {
            textWatermarkDiv.classList.remove('hidden');
            imageWatermarkDiv.classList.add('hidden');
        } else {
            textWatermarkDiv.classList.add('hidden');
            imageWatermarkDiv.classList.remove('hidden');
        }
        updateControlsState();
        if (autoRefresh.checked) drawWatermark();
    });
});

// 水印图片上传
watermarkImageInput.addEventListener('change', function() {
    var f = this.files[0];
    if (!f || !(f.type in validTypes)) return;
    var reader = new FileReader();
    reader.onload = function() {
        watermarkImg = new Image();
        watermarkImg.onload = function() {
            if (autoRefresh.checked) drawWatermark();
        };
        watermarkImg.src = reader.result;
    };
    reader.readAsDataURL(f);
});

// 下载按钮
$('#download').addEventListener('click', function() {
    if (!canvas) return;
    var link = document.createElement('a');
    link.download = generateFileName();
    var imageData = canvas.toDataURL('image/png');
    var blob = dataURItoBlob(imageData);
    link.href = URL.createObjectURL(blob);
    link.click();
});

// 重置按钮
var defaultValues = { text: '', color: '#7F7F7F', alpha: '0.5', angle: '45', space: '4', size: '1', inline: '1' };
$('#reset').addEventListener('click', function() {
    inputItems.forEach(function(item) {
        input[item].value = defaultValues[item];
        setDisplayValue(item);
    });
    document.querySelector('input[name="position"][value="tile"]').checked = true;
    document.querySelector('input[name="watermark-type"][value="text"]').checked = true;
    textWatermarkDiv.classList.remove('hidden');
    imageWatermarkDiv.classList.add('hidden');
    updateControlsState();
    if (autoRefresh.checked) drawWatermark();
});

// 页面加载时初始化控件状态
updateControlsState();
