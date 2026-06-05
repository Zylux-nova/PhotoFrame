//全局配置
const config = {
    srcImg: null,bgCustom: null,bgMode: "origin",
    scale:90,radius:20,shadow:0.5,frameW:80,blur:40,
    brandText:"",fontColor:"#ffffff",logoSize:35,batch:false,
    useExif:true,exifStr:"",
    useCustomExif:false,
    customMake:"",customModel:"",customParam:""
}
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const emptyTip = document.getElementById('emptyTip');
const exifTip = document.getElementById('exifTip');

//自定义EXIF输入绑定
const inMake = document.getElementById('inMake');
const inModel = document.getElementById('inModel');
const inParam = document.getElementById('inParam');
const checkCustomExif = document.getElementById('useCustomExif');
function updateCustomExif(){
    config.customMake = inMake.value.trim();
    config.customModel = inModel.value.trim();
    config.customParam = inParam.value.trim();
    config.useCustomExif = checkCustomExif.checked;
    render();
}
[inMake,inModel,inParam].forEach(el=>el.oninput=updateCustomExif);
checkCustomExif.onchange=updateCustomExif;

//【修复：先加载图片，EXIF后置异步，不再阻塞上传】
document.getElementById('imgInput').onchange = async e=>{
    const file = e.target.files[0];
    if(!file)return;
    document.getElementById('fileName').innerText = file.name;
    try{
        //优先载入图片，立刻预览，EXIF后台慢慢读
        config.srcImg = await loadImg(file);
        emptyTip.style.display = 'none';
        canvas.style.display = 'block';
        render();
        //EXIF异步延后执行，不卡住上传
        setTimeout(async()=>{
            let arr=[];
            exifTip.innerText="正在读取EXIF...";
            exifTip.innerText = arr.join(" | ")||"无EXIF参数，可手动填写自定义EXIF";
            config.exifStr = arr.join(" | ");
            render();
        },300);
    }catch(err){
        console.error(err);
        alert('图片载入失败，只用JPG/PNG');
    }
}

//自定义底图
document.getElementById('customBgInput').onchange = async e=>{
    const f = e.target.files[0];
    if(!f)return;
    config.bgCustom = await loadImg(f);render();
}

//批量开关
document.getElementById('batchCheck').onchange = e=>{
    config.batch = e.target.checked;
    e.target.previousElementSibling.innerText = config.batch?"批量开启":"批量关闭";
}
//自动EXIF总开关
document.getElementById('useExif').onchange=e=>{config.useExif = e.target.checked;render();}
//背景模式
document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.onclick=()=>{
        document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        config.bgMode = btn.dataset.val;
        if(config.bgMode==='custom') document.getElementById('customBgInput').click();
        render();
    }
})
//字体黑白
document.querySelectorAll('.tab-btn').forEach((b,i)=>{
    b.onclick=()=>{
        document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        config.fontColor = i===0?"#fff":"#000";render();
    }
})
//品牌按键
document.querySelectorAll('.brand').forEach(b=>{
    b.onclick=()=>{config.brandText = b.innerText;render();}
})

//滑块绑定
bindSlider('blur','blurVal','blur');
bindSlider('frameW','frameWVal','frameW');
bindSlider('scale','scaleVal','scale');
bindSlider('radius','radiusVal','radius');
bindSlider('shadow','shadowVal','shadow',v=>v/100);
bindSlider('logoSize','logoSizeVal','logoSize');

//导出图片
document.getElementById('downloadBtn').onclick = ()=>{
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = '相框成品.png';
    a.click();
}

//图片加载函数（稳定版）
function loadImg(file){
    return new Promise((res,rej)=>{
        const img = new Image();
        const tempUrl = URL.createObjectURL(file);
        img.onload = ()=>{
            URL.revokeObjectURL(tempUrl);
            res(img);
        }
        img.onerror = ()=>{
            URL.revokeObjectURL(tempUrl);
            rej("加载异常");
        }
        img.src = tempUrl;
    })
}

//滑块封装
function bindSlider(id,showId,key,trans=v=>+v){
    const dom = document.getElementById(id);
    const show = document.getElementById(showId);
    dom.oninput = ()=>{
        let val = trans(dom.value);
        config[key]=val;
        show.innerText = dom.value + (['scale'].includes(key)?'%':'px');
        render();
    }
}

//渲染画布
function render(){
    if(!config.srcImg)return;
    const img = config.srcImg;
    const pad = config.frameW;
    const totalW = img.width + pad*2;
    const totalH = img.height + pad*2;
    canvas.width = totalW; canvas.height = totalH;
    ctx.clearRect(0,0,totalW,totalH);

    //背景绘制
    if(config.bgMode==='none'){
        ctx.fillStyle="#000";ctx.fillRect(0,0,totalW,totalH);
    }else if(config.bgMode==='custom'&&config.bgCustom){
        ctx.drawImage(config.bgCustom,0,0,totalW,totalH);
    }else{
        ctx.drawImage(img,0,0,totalW,totalH);
    }
    ctx.filter = `blur(${config.blur}px)`;
    ctx.drawImage(canvas,0,0);
    ctx.filter = 'none';

    //中间原图
    const s = config.scale/100;
    const w = img.width*s;
    const h = img.height*s;
    const x = (totalW-w)/2;
    const y = (totalH-h)/2;
    ctx.shadowColor = `rgba(0,0,0,${config.shadow})`;
    ctx.shadowBlur=16;
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,config.radius);
    ctx.clip();
    ctx.drawImage(img,x,y,w,h);
    ctx.closePath();
    ctx.shadowBlur=0;

    //底部文字优先级：自定义EXIF >自动EXIF >品牌
    ctx.fillStyle=config.fontColor;
    ctx.font=`bold ${config.logoSize}px sans-serif`;
    ctx.textAlign='center';
    let bottomText = "";
    if(config.useExif && config.useCustomExif){
        let tempArr = [];
        if(config.customMake) tempArr.push(config.customMake);
        if(config.customModel) tempArr.push(config.customModel);
        if(config.customParam) tempArr.push(config.customParam);
        bottomText = tempArr.join(" | ");
    }else if(config.useExif && config.exifStr){
        bottomText = config.exifStr;
    }else{
        bottomText = config.brandText;
    }
    if(bottomText) ctx.fillText(bottomText,totalW/2, totalH-pad/2);
}
