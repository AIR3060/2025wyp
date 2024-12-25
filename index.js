/*
  author: sakura
*/
 
// 主对象，用于初始化应用程序
var S = {
  init: function () {
    try {
      preloadAssets();
      var action = window.location.href,
          i = action.indexOf('?a=');
 
      // 初始化绘图在一个canvas元素上
      S.Drawing.init('.canvas');
      document.body.classList.add('body--ready');
 
      // 检查URL中是否有动作参数，否则使用默认消息
      if (i !== -1) {
        S.UI.simulate(decodeURI(action).substring(i + 3));
      } else {
        S.UI.simulate('#countdown 3|祝|郁辰茜|新年快乐|愿你|新的一年|顺风顺水|扶摇直上|百事无忌|平安喜乐|万事胜意|前程似锦|天天开心|2025年快乐');
      }
 
      // 开始绘图循环
      S.Drawing.loop(function () {
        S.Shape.render();
      });
    } catch(e) {
      console.error('初始化失败:', e);
      // 显示友好的错误提示
      document.body.innerHTML = '<div style="text-align:center;padding-top:50px;">抱歉,加载失败,请刷新页面重试</div>';
    }
  }
};
 
// 模块：处理绘图操作
S.Drawing = (function () {
  var canvas,
      context,
      renderFn,
      requestFrame = window.requestAnimationFrame ||
                     window.webkitRequestAnimationFrame ||
                     window.mozRequestAnimationFrame ||
                     window.oRequestAnimationFrame ||
                     window.msRequestAnimationFrame ||
                     function(callback) {
                       window.setTimeout(callback, 1000 / 60);
                     };
 
  return {
    init: function (el) {
      canvas = document.querySelector(el);
      context = canvas.getContext('2d');
      this.adjustCanvas();
 
      // 窗口大小调整时调整画布大小
      window.addEventListener('resize', function (e) {
        S.Drawing.adjustCanvas();
      });
    },
 
    loop: function (fn) {
      renderFn = !renderFn ? fn : renderFn;
      this.clearFrame();
      renderFn();
      requestFrame.call(window, this.loop.bind(this));
    },
 
    adjustCanvas: function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },
 
    clearFrame: function () {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },
 
    getArea: function () {
      return { w: canvas.width, h: canvas.height };
    },
 
    drawCircle: function (p, c) {
      context.fillStyle = c.render();
      context.beginPath();
      context.arc(p.x, p.y, p.z, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }
  }
}());
 
// 模块：处理用户界面交互
S.UI = (function () {
  var canvas = document.querySelector('.canvas'),
      interval,
      isTouch = false, // 检测设备是否支持触摸
      currentAction,
      resizeTimer,
      time,
      maxShapeSize = 30,
      firstAction = true,
      sequence = [],
      cmd = '#';
 
  // 格式化当前时间为字符串
  function formatTime(date) {
    var h = date.getHours(),
        m = date.getMinutes();
    m = m < 10 ? '0' + m : m;
    return h + ':' + m;
  }
 
  // 从命令中提取值
  function getValue(value) {
    return value && value.split(' ')[1];
  }
 
  // 从命令中提取动作
  function getAction(value) {
    value = value && value.split(' ')[0];
    return value && value[0] === cmd && value.substring(1);
  }
 
  // 按时间执行动作
  function timedAction(fn, delay, max, reverse) {
    clearInterval(interval);
    currentAction = reverse ? max : 1;
    fn(currentAction);
 
    if (!max || (!reverse && currentAction < max) || (reverse && currentAction > 0)) {
      interval = setInterval(function () {
        currentAction = reverse ? currentAction - 1 : currentAction + 1;
        fn(currentAction);
 
        if ((!reverse && max && currentAction === max) || (reverse && currentAction === 0)) {
          clearInterval(interval);
        }
      }, delay);
    }
  }
 
  // 重置UI状态
  function reset(destroy) {
    clearInterval(interval);
    sequence = [];
    time = null;
    destroy && S.Shape.switchShape(S.ShapeBuilder.letter(''));
  }
 
  // 添加输入验证函数
  function sanitizeInput(input) {
    if(!input) return '';
    // 移除潜在的XSS代码
    return input.replace(/[<>]/g, '')
               .replace(/javascript:/gi, '')
               .replace(/on\w+=/gi, '')
               .trim();
  }
 
  // 执行一系列动作
  function performAction(value) {
    value = sanitizeInput(value);
    var action,
        current;
 
    sequence = typeof(value) === 'object' ? value : sequence.concat(value.split('|'));
 
    function showNextText() {
      if (sequence.length === 0) {
        // 当所有文字显示完毕后，显示时间
        showCurrentTime();
        return;
      }
      
      current = sequence.shift();
      action = getAction(current);
      value = getValue(current);
 
      if (action === 'countdown') {
        // 处理倒计时
        value = parseInt(value) || 3;
        timedAction(function (index) {
          if (index === 0) {
            // 倒计时结束后，延迟1秒开始显示文字
            setTimeout(() => {
              showNextText();
            }, 1000);
          } else {
            S.Shape.switchShape(S.ShapeBuilder.letter(index), true);
          }
        }, 1000, value, true);
      } else {
        // 显示普通文字
        S.Shape.switchShape(S.ShapeBuilder.letter(current));
        setTimeout(showNextText, 1500);
      }
    }
 
    // 开始显示
    showNextText();
  }
 
  // 检查输入宽度并相应调整UI
  function checkInputWidth(e) {
    if (input.value.length > 18) {
      ui.classList.add('ui--wide');
    } else {
      ui.classList.remove('ui--wide');
    }
 
    if (firstAction && input.value.length > 0) {
      ui.classList.add('ui--enter');
    } else {
      ui.classList.remove('ui--enter');
    }
  }
 
  // 绑定UI交互事件监听器
  function bindEvents() {
    document.body.addEventListener('keydown', function (e) {
      input.focus();
 
      if (e.keyCode === 13) {
        firstAction = false;
        reset();
        performAction(input.value);
      }
    });
 
    canvas.addEventListener('click', function (e) {
      overlay.classList.remove('overlay--visible');
    });
  }
 
  // 初始化UI模块
  function init() {
    bindEvents();
    isTouch && document.body.classList.add('touch');
  }
 
  // 初始化
  init();
 
  return {
    simulate: function (action) {
      action = sanitizeInput(action);
      performAction(action);
    }
  }
}());
 
// 模块：处理选项卡交互
S.UI.Tabs = (function () {
  var tabs = document.querySelector('.tabs'),
      labels = document.querySelector('.tabs-labels'),
      triggers = document.querySelectorAll('.tabs-label'),
      panels = document.querySelectorAll('.tabs-panel');
 
  // 激活特定选项卡
  function activate(i) {
    triggers[i].classList.add('tabs-label--active');
    panels[i].classList.add('tabs-panel--active');
  }
 
  // 绑定选项卡交互事件
  function bindEvents() {
    labels.addEventListener('click', function (e) {
      var el = e.target,
          index;
 
      if (el.classList.contains('tabs-label')) {
        for (var t = 0; t < triggers.length; t++) {
          triggers[t].classList.remove('tabs-label--active');
          panels[t].classList.remove('tabs-panel--active');
 
          if (el === triggers[t]) {
            index = t;
          }
        }
 
        activate(index);
      }
    });
  }
 
  // 初始化选项卡模块
  function init() {
    activate(0);
    bindEvents();
  }
 
  // 初始化
  init();
}());
 
// 构造函数：定义3D空间中的点
S.Point = function (args) {
  this.x = args.x;
  this.y = args.y;
  this.z = args.z;
  this.a = args.a;
  this.h = args.h;
};
 
// 构造函数：定义具有RGBA值的颜色
S.Color = function (r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
};
 
// 原型：渲染颜色
S.Color.prototype = {
  render: function () {
    return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
  }
};
 
// 构造函数：定义一个点，具有额外的属性
S.Dot = function (x, y) {
  this.p = new S.Point({
    x: x,
    y: y,
    z: 5,
    a: 1,
    h: 0
  });
 
  this.e = 0.07;
  this.s = true;
 
  this.c = new S.Color(255, 255, 255, this.p.a);
 
  this.t = this.clone();
  this.q = [];
};
 
// 原型：点的行为
S.Dot.prototype = {
  clone: function () {
    return new S.Point({
      x: this.x,
      y: this.y,
      z: this.z,
      a: this.a,
      h: this.h
    });
  },
 
  _draw: function () {
    this.c.a = this.p.a;
    S.Drawing.drawCircle(this.p, this.c);
  },
 
  _moveTowards: function (n) {
    var details = this.distanceTo(n, true),
        dx = details[0],
        dy = details[1],
        d = details[2],
        e = this.e * d;
 
    if (this.p.h === -1) {
      this.p.x = n.x;
      this.p.y = n.y;
      return true;
    }
 
    if (d > 1) {
      this.p.x -= ((dx / d) * e);
      this.p.y -= ((dy / d) * e);
    } else {
      if (this.p.h > 0) {
        this.p.h--;
      } else {
        return true;
      }
    }
 
    return false;
  },
 
  _update: function () {
    if (this._moveTowards(this.t)) {
      var p = this.q.shift();
 
      if (p) {
        this.t.x = p.x || this.p.x;
        this.t.y = p.y || this.p.y;
        this.t.z = p.z || this.p.z;
        this.t.a = p.a || this.p.a;
        this.p.h = p.h || 0;
      } else {
        if (this.s) {
          this.p.x -= Math.sin(Math.random() * 3.142);
          this.p.y -= Math.sin(Math.random() * 3.142);
        } else {
          this.move(new S.Point({
            x: this.p.x + (Math.random() * 50) - 25,
            y: this.p.y + (Math.random() * 50) - 25,
          }));
        }
      }
    }
 
    d = this.p.a - this.t.a;
    this.p.a = Math.max(0.1, this.p.a - (d * 0.05));
    d = this.p.z - this.t.z;
    this.p.z = Math.max(1, this.p.z - (d * 0.05));
  },
 
  distanceTo: function (n, details) {
    var dx = this.p.x - n.x,
        dy = this.p.y - n.y,
        d = Math.sqrt(dx * dx + dy * dy);
 
    return details ? [dx, dy, d] : d;
  },
 
  move: function (p, avoidStatic) {
    if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
      this.q.push(p);
    }
  },
 
  render: function () {
    this._update();
    this._draw();
  }
}
 
// 模块：构建形状
S.ShapeBuilder = (function () {
  var gap = 13,
      shapeCanvas = document.createElement('canvas'),
      shapeContext = shapeCanvas.getContext('2d'),
      fontSize = 500,
      fontFamily = 'Avenir, Helvetica Neue, Helvetica, Arial, sans-serif';
 
  // 适应窗口大小
  function fit() {
    shapeCanvas.width = Math.floor(window.innerWidth / gap) * gap;
    shapeCanvas.height = Math.floor(window.innerHeight / gap) * gap;
    shapeContext.fillStyle = 'red';
    shapeContext.textBaseline = 'middle';
    shapeContext.textAlign = 'center';
  }
 
  // 处理画布以提取点
  function processCanvas() {
    var pixels = shapeContext.getImageData(0, 0, shapeCanvas.width, shapeCanvas.height).data;
        dots = [],
        x = 0,
        y = 0,
        fx = shapeCanvas.width,
        fy = shapeCanvas.height,
        w = 0,
        h = 0;
 
    for (var p = 0; p < pixels.length; p += (4 * gap)) {
      if (pixels[p + 3] > 0) {
        dots.push(new S.Point({
          x: x,
          y: y
        }));
 
        w = x > w ? x : w;
        h = y > h ? y : h;
        fx = x < fx ? x : fx;
        fy = y < fy ? y : fy;
      }
 
      x += gap;
 
      if (x >= shapeCanvas.width) {
        x = 0;
        y += gap;
        p += gap * 4 * shapeCanvas.width;
      }
    }
 
    return { dots: dots, w: w + fx, h: h + fy };
  }
 
  // 设置字体大小用于文本渲染
  function setFontSize(s) {
    shapeContext.font = 'bold ' + s + 'px ' + fontFamily;
  }
 
  // 检查值是否为数字
  function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
 
  // 初始化形状构建器
  function init() {
    fit();
    window.addEventListener('resize', fit);
  }
 
  // 初始化
  init();
 
  return {
    imageFile: function (url, callback) {
      var image = new Image(),
          a = S.Drawing.getArea();
 
      image.onload = function () {
        shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
        shapeContext.drawImage(this, 0, 0, a.h * 0.6, a.h * 0.6);
        callback(processCanvas());
      };
 
      image.onerror = function () {
        callback(S.ShapeBuilder.letter('What?'));
      }
 
      image.src = url;
    },
 
    circle: function (d) {
      var r = Math.max(0, d) / 2;
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.beginPath();
      shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false);
      shapeContext.fill();
      shapeContext.closePath();
 
      return processCanvas();
    },
 
    letter: function (l) {
      var s = 0;
 
      setFontSize(fontSize);
      s = Math.min(fontSize,
                  (shapeCanvas.width / shapeContext.measureText(l).width) * 0.8 * fontSize,
                  (shapeCanvas.height / fontSize) * (isNumber(l) ? 1 : 0.45) * fontSize);
      setFontSize(s);
 
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.fillText(l, shapeCanvas.width / 2, shapeCanvas.height / 2);
 
      return processCanvas();
    },
 
    rectangle: function (w, h) {
      var dots = [],
          width = gap * w,
          height = gap * h;
 
      for (var y = 0; y < height; y += gap) {
        for (var x = 0; x < width; x += gap) {
          dots.push(new S.Point({
            x: x,
            y: y,
          }));
        }
      }
 
      return { dots: dots, w: width, h: height };
    }
  };
}());
 
// 模块：管理形状及其转换
S.Shape = (function () {
  var dots = [],
      width = 0,
      height = 0,
      cx = 0,
      cy = 0;
 
  // 补偿画布中心
  function compensate() {
    var a = S.Drawing.getArea();
 
    cx = a.w / 2 - width / 2;
    cy = a.h / 2 - height / 2;
  }
 
  return {
    shuffleIdle: function () {
      var a = S.Drawing.getArea();
 
      for (var d = 0; d < dots.length; d++) {
        if (!dots[d].s) {
          dots[d].move({
            x: Math.random() * a.w,
            y: Math.random() * a.h
          });
        }
      }
    },
 
    switchShape: function (n, fast) {
      var size,
          a = S.Drawing.getArea();
 
      width = n.w;
      height = n.h;
 
      compensate();
 
      if (n.dots.length > dots.length) {
        size = n.dots.length - dots.length;
        for (var d = 1; d <= size; d++) {
          dots.push(new S.Dot(a.w / 2, a.h / 2));
        }
      }
 
      var d = 0,
          i = 0;
 
      while (n.dots.length > 0) {
        i = Math.floor(Math.random() * n.dots.length);
        dots[d].e = fast ? 0.25 : (dots[d].s ? 0.14 : 0.11);
 
        if (dots[d].s) {
          dots[d].move(new S.Point({
            z: Math.random() * 20 + 10,
            a: Math.random(),
            h: 18
          }));
        } else {
          dots[d].move(new S.Point({
            z: Math.random() * 5 + 5,
            h: fast ? 18 : 30
          }));
        }
 
        dots[d].s = true;
        dots[d].move(new S.Point({
          x: n.dots[i].x + cx,
          y: n.dots[i].y + cy,
          a: 1,
          z: 5,
          h: 0
        }));
 
        n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1));
        d++;
      }
 
      // 减少动画效果
      for (var i = d; i < dots.length; i++) {
        if (dots[i].s) {
          dots[i].move(new S.Point({
            z: Math.random() * 10 + 5,  // 减小随机范围
            a: Math.random(),
            h: 10  // 减小高度
          }));
 
          dots[i].s = false;
          dots[i].e = 0.04;
          dots[i].move(new S.Point({
            x: Math.random() * a.w,
            y: Math.random() * a.h,
            a: 0.3,
            z: Math.random() * 2,  // 减小z轴范围
            h: 0
          }));
        }
      }
    },
 
    render: function () {
      for (var d = 0; d < dots.length; d++) {
        dots[d].render();
      }
    },
 
    getCurrentDots: function() {
      return dots;
    }
  }
}());
 
// 初始化应用程序
S.init();
 
// 在文件末尾添加性能优化代码
(function(){
  let ticking = false;
  const originalFrame = frame;
  
  // 重写 frame 函数添加节流
  window.frame = function() {
    if(!ticking) {
      requestAnimationFrame(() => {
        originalFrame();
        ticking = false;
      });
      ticking = true;
    }
  }
})();
 
// 添加全局错误处理
window.onerror = function(msg, url, line, col, error) {
  console.error('全局错误:', {msg, url, line, col, error});
  return false;
};

// 在 initVars 函数前添加预加载函数
function preloadAssets() {
  // 预加载图片
  const imageUrls = [];
  for(let i=1; i<=10; i++) {
    imageUrls.push(`https://cantelope.org/NYE/spark${i}.png`);
  }
  
  imageUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
  
  // 预加载音频
  const audioUrls = [
    'https://cantelope.org/NYE/pow1.ogg',
    'https://cantelope.org/NYE/pow2.ogg',
    'https://cantelope.org/NYE/pow3.ogg',
    'https://cantelope.org/NYE/pow4.ogg'
  ];
  
  audioUrls.forEach(url => {
    const audio = new Audio();
    audio.src = url;
  });
}

// 修改显示时间的函数
function showCurrentTime() {
  // 创建一个新的canvas用于显示时间
  const timeCanvas = document.createElement('canvas');
  timeCanvas.style.position = 'absolute';
  timeCanvas.style.width = '100%';
  timeCanvas.style.height = '100%';
  timeCanvas.style.zIndex = '10000';
  document.body.appendChild(timeCanvas);
  
  const ctx = timeCanvas.getContext('2d');
  timeCanvas.width = window.innerWidth;
  timeCanvas.height = window.innerHeight;
  
  function updateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    const dateString = `${year}年${month}月${day}日`;
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    // 清除画布
    ctx.clearRect(0, 0, timeCanvas.width, timeCanvas.height);
    
    // 设置文字样式
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 绘制日期（稍小一点的字体）
    ctx.font = 'bold 40px Arial';
    ctx.fillText(dateString, timeCanvas.width / 2, timeCanvas.height / 2 - 40);
    
    // 绘制时间（大一点的字体）
    ctx.font = 'bold 60px Arial';
    ctx.fillText(timeString, timeCanvas.width / 2, timeCanvas.height / 2 + 20);
  }
  
  // 处理窗口大小变化
  window.addEventListener('resize', () => {
    timeCanvas.width = window.innerWidth;
    timeCanvas.height = window.innerHeight;
    updateTime();
  });
  
  // 立即显示一次时间
  updateTime();
  // 每秒更新一次时间
  setInterval(updateTime, 1000);
  
  // 停止原来的动画
  S.Shape.switchShape(S.ShapeBuilder.letter(''));
}
