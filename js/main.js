//轻量化EXIF解析
const EXIF = (function(){
    function ExifParser(buf){this.view=new DataView(buf);this.offset=0;this.tags={};}
    ExifParser.prototype.readU16=function(e){return this.view.getUint16(e,!this.le)};
    ExifParser.prototype.readU32=function(e){return this.view.getUint32(e,!this.le)};
    ExifParser.prototype.findMarker=function(){
        for(let i=0;i<this.view.byteLength-1;i++){
            if(this.view.getUint8(i)===0xFF&&this.view.getUint8(i+1)===0xE1)return i+4;
        }return -1;
    };
    ExifParser.prototype.parse=function(){
        let start=this.findMarker();
        if(start<0)return{};
        this.le=(this.readU16(start)===0x4949);
        let count=this.readU16(start+2);
        for(let i=0;i<count;i++){
            let pos=start+4+i*12;
            let tag=this.readU16(pos);
            let val=this.readU32(pos+8);
            switch(tag){
                case 271:this.tags.Make=String.fromCharCode(...new Uint8Array(this.view.buffer,val)).replace(/\0/g,'');break;
                case 272:this.tags.Model=String.fromCharCode(...new Uint8Array(this.view.buffer,val)).replace(/\0/g,'');break;
                case 33434:this.tags.FNum=(this.readU32(val)/this.readU32(val+4)).toFixed(1);break;
                case 34850:this.tags.ISO=val;break;
                case 33439:let s=Math.round((this.readU32(val)/this.readU32(val+4))*1000)/1000;this.tags.S=s>1?s+'s':'1/'+Math.round(1/s);break;
                case 33437:this.tags.Focal=(this.readU32(val)/this.readU32(val+4)).toFixed(0);break;
            }
        }
        return this.tags;
    };
    return {
        getExif(file){
            return new Promise(res=>{
                const fr=new FileReader();
                fr.onload=e=>res(new ExifParser(e.target.result).parse());
                fr.onerror=()=>res({});
                fr.readAsArrayBuffer(file.slice(0,65536));
            })
        }
    }
})();

//全局配置
const config = {
    srcImg: null,bgCustom: null,bgMode: "origin",
    scale:90,radius:20,shadow:0.5,frameW:80,blur:40,
    brandText:"",fontColor:"#ffffff",logoSize:35,batch:false,
    useExif:true,exifStr:"",
    //自定义EXIF配置
    useCustomExif:false,
    customMake:"",
    customModel:"",
    customParam:""
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

//图片上传
document.getElementById('imgInput').onchange = async e=>{
    const file = e.target.files[0];
    if(!file)return;
    document.getElementById('fileName').innerText = file.name;
    try{
        config.srcImg = await loadImg(file);
        emptyTip.style.display = 'none';
        canvas.style.display = 'block';
        //读取自动EXIF
        const tag = await EXIF.getExif(file);
        let arr=[];
        if(tag.Make)arr.push(tag.Make.trim());
        if(tag.Model)arr.push(tag.Model.trim());
        if(tag.FNum)arr.push(`f/${tag.FNum}`);
        if(tag.S)arr.push(tag.S);
        if(tag.ISO)arr.push(`ISO${tag.ISO}`);
        if(tag.Focal)arr.push(`${tag.Focal}mm`);
        config.exifStr = arr.join(" | ");
        exifTip.innerText = config.exifStr||"无EXIF参数，可手动填写自定义EXIF";
        render();
    }catch(err){
        alert('图片加载失败，请使用JPG/PNG格式');
        console.error(err);
    }
}
//自定义背景
document.getElementById('customBgInput').onchange = async e=>{
    const f = e.target.files[0];
    if(!f)return;
    try{config.bgCustom = await loadImg(f);render();}catch{alert('底图加载异常')}
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
//字体黑白切换
document.querySelectorAll('.tab-btn').forEach((b,i)=>{
    b.onclick=()=>{
        document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        config.fontColor = i===0?"#fff":"#000";render();
    }
})
//品牌按钮
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

//图片加载
function loadImg(file){
    return new Promise((res,rej)=>{
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = ()=>{URL.revokeObjectURL(url);res(img);};
        img.onerror = ()=>{URL.revokeObjectURL(url);rej('load err');};
        img.src = url;
    })
}
//滑块工具
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

//画布渲染（优先级：自定义EXIF>自动EXIF>手动品牌）
function render(){
    if(!config.srcImg)return;
    const img = config.srcImg;
    const pad = config.frameW;
    const totalW = img.width + pad*2;
    const totalH = img.height + pad*2;
    canvas.width = totalW; canvas.height = totalH;
    ctx.clearRect(0,0,totalW,totalH);

    //绘制背景
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

    //主体图片
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

    //底部文字逻辑
    ctx.fillStyle=config.fontColor;
    ctx.font=`bold ${config.logoSize}px sans-serif`;
    ctx.textAlign='center';
    let bottomText = "";

    //优先级：自定义EXIF > 自动EXIF > 手动品牌
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
