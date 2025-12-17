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
            canvas.className = 'mt-6 w-full cursor-pointer rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-3 shadow-inner transition hover:border-slate-400';
            canvas.width = img.width;
            canvas.height = img.height;
            textCtx = null;

            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            repaint = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };

            drawText();

            graph.innerHTML = '';
            graph.appendChild(canvas);

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

var drawText = function() {
    if (!canvas) return;
    if (!input.text.value) return;
    var textSize = input.size.value * Math.max(15, (Math.min(canvas.width, canvas.height) / 25));
    var centerX = canvas.width / 2;
    var centerY = canvas.height / 2;
    var inlineSpacing = parseFloat(input.inline ? input.inline.value : 1);

    if (textCtx) {
        repaint();
    } else {
        textCtx = canvas.getContext('2d');
    }

    textCtx.save();
    textCtx.translate(centerX, centerY);
    textCtx.rotate(input.angle.value * Math.PI / 180);

    textCtx.fillStyle = makeStyle();
    textCtx.font = 'bold ' + textSize + 'px -apple-system,"Helvetica Neue",Helvetica,Arial,"PingFang SC","Hiragino Sans GB","WenQuanYi Micro Hei",sans-serif';

    var width = (textCtx.measureText(input.text.value)).width;
    var step = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2));
    var margin = inlineSpacing * (textCtx.measureText('啊')).width;

    var x = Math.ceil(step / (width + margin));
    var y = Math.ceil((step / (input.space.value * textSize)) / 2);

    for (var i = -x; i < x; i++) {
        for (var j = -y; j <= y; j++) {
            textCtx.fillText(input.text.value, (width + margin) * i, input.space.value * textSize * j);
        }
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

image.addEventListener('change', function() {
    file = this.files[0];

    if (!(file.type in {'image/png': 1, 'image/jpeg': 1, 'image/gif': 1})) {
        return alert('仅支持 png, jpg, gif 图片格式');
    }

    readFile();
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
        if (autoRefresh.checked) drawText();
    });

    refresh.addEventListener('click', drawText);
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
