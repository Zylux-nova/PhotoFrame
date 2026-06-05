// 全局参数
const cfg = {
    scale: 90,
    radius:33,
    shadow:0.35,
    frameW:20,
    blur:8,
    brand:'',
    fontColor:'#ffffff',
    logoSize:30,
    bgImg:null,
    srcImg:null,
    batch:false
}
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 原图上传
document.getElementById('imgInput').onchange = async(e)=>{
    const file = e.target.files[0];
    if(!file)return;
    cfg.srcImg = await loadImg(file);
    renderFrame();
}
// 相框背景图
document.getElementById('bgInput').onchange = async(e)=>{
    const f = e.target.files[0];
    if(!f)return;
    cfg.bgImg = await loadImg(f);
    renderFrame();
}
// 批量勾选
document.getElementById('batchCheck').onchange = e=>cfg.batch = e.target.checked;

// 滑块绑定
bindSlider('scale','scaleVal','scale');
bindSlider('radius','radiusVal','radius');
bindSlider('shadow','shadowVal','shadow',v=>v/100);
bindSlider('frameW','frameWVal','frameW');
bindSlider('blur','blurVal','blur');
bindSlider('logoSize','logoSizeVal','logoSize');

// 品牌点击
document.querySelectorAll('.brand-btn').forEach(btn=>{
    btn.onclick = ()=>{cfg.brand = btn.textContent;renderFrame()}
})
// 字体颜色
document.querySelectorAll('input[name=fontColor]').forEach(r=>{
    r.onchange=()=>{cfg.fontColor=r.value;renderFrame()}
})

// 下载图片
document.getElementById('downBtn').onclick = ()=>{
    const a = document.createElement('a');
    a.download='相框成品.png';
    a.href=canvas.toDataURL('image/png');
    a.click();
}

// 加载图片工具
function loadImg(file){
    return new Promise(res=>{
        const i = new Image();
        i.src=URL.createObjectURL(file);
        i.onload=()=>res(i);
    })
}
// 滑块通用绑定
function bindSlider(id,valId,cfgKey,trans=v=>+v){
    const dom = document.getElementById(id);
    const valDom = document.getElementById(valId);
    dom.oninput = ()=>{
        const v = trans(dom.value);
        cfg[cfgKey]=v;
        valDom.textContent = dom.value + (id=='scale'?'%':id=='frameW'?'%':'px');
        renderFrame();
    }
}

// 核心绘制相框
function renderFrame(){
    if(!cfg.srcImg) return;
    const ori = cfg.srcImg;
    // 相框总宽高
    const fwRate = cfg.frameW/100;
    const totalW = ori.width*(1+fwRate*2);
    const totalH = ori.height*(1+fwRate*2);
    canvas.width=totalW;canvas.height=totalH;

    // 绘制背景：自定义图/原图模糊
    if(cfg.bgImg){
        ctx.drawImage(cfg.bgImg,0,0,totalW,totalH);
    }else{
        ctx.drawImage(ori,0,0,totalW,totalH);
    }
    // 高斯模糊
    ctx.filter = `blur(${cfg.blur}px)`;
    ctx.drawImage(canvas,0,0);
    ctx.filter='none';

    // 绘制中间原图
    const sRate = cfg.scale/100;
    const w = ori.width*sRate;
    const h = ori.height*sRate;
    const x = (totalW - w)/2;
    const y = (totalH - h)/2;

    // 阴影立体
    ctx.shadowColor='rgba(0,0,0,'+cfg.shadow+')';
    ctx.shadowBlur=15;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,cfg.radius);
    ctx.clip();
    ctx.drawImage(ori,x,y,w,h);
    ctx.closePath();
    ctx.shadowBlur=0;

    // 底部品牌文字
    if(cfg.brand){
        ctx.fillStyle=cfg.fontColor;
        ctx.font=`bold ${cfg.logoSize}px sans-serif`;
        ctx.textAlign='center';
        ctx.fillText(cfg.brand.toUpperCase(),totalW/2, totalH-fwRate*ori.height/2);
    }
}
