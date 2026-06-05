
const EXIF = {};
(function(){function e(t){this.tags={},this.exif={},this.gps={},this.image={},this.thumbnail={},this.file=t}EXIF.getData=function(t,e){if(!t||!t.files||!t.files[0])return;let n=new FileReader;n.onload=function(){EXIF.readFromBinaryFile(new DataView(n.result),t,e)},n.readAsArrayBuffer(t.files[0])},EXIF.readFromBinaryFile=function(t,e){let n=new EXIF(t);n.parse(),e&&e(n)},EXIF.prototype.parse=function(){let t=this.tiffStart=this.findTag([0xffd8,0xffe1]),e=this.fileStart=t+4,n=new Uint8Array(this.file.buffer),r=n[e+2]*256+n[e+3];this.bigEndian=65534===r;let i=this.getShort(e+4);for(let o=0;o<i;o++){let s=e+6+12*o,a=this.getShort(s);switch(a){case271:this.image.Make=this.getString(s+8);break;case272:this.image.Model=this.getString(s+8);break;case33434:this.exif.FNumber=this.getRational(s+8);break;case33437:this.exif.FocalLength=this.getRational(s+8);break;case34850:this.exif.ISOSpeedRatings=this.getShort(s+8);break;case33439:this.exif.ExposureTime=this.getRational(s+8);break;case306:this.image.DateTime=this.getString(s+8);break;case34665:let l=this.getLong(s+8);this.parseEXIF(e+l);break;case34853:let d=this.getLong(s+8);this.parseGPS(e+d)}}},EXIF.prototype.getShort=function(t){return this.bigEndian?this.file.getUint16(t):this.file.getUint16(t,!0)},EXIF.prototype.getLong=function(t){return this.bigEndian?this.file.getUint32(t):this.file.getUint32(t,!0)},EXIF.prototype.getRational=function(t){let e=this.getLong(t),n=this.getLong(t+4);return n===0?0:e/n},EXIF.prototype.getString=function(t){let e=[];for(;;){let n=this.file.getUint8(t++);if(0===n)break;e.push(String.fromCharCode(n))}return e.join("")},EXIF.prototype.findTag=function(t){for(let e=0;e<this.file.byteLength-1;e++){let n=this.file.getUint8(e)*256+this.file.getUint8(e+1);for(let r=0;r<t.length;r++)if(t[r]===n)return e}return-1},EXIF.prototype.parseEXIF=function(t){let e=this.getShort(t+4);for(let n=0;n<e;n++){let r=t+6+12*n,i=this.getShort(r);switch(i){case33434:this.exif.FNumber=this.getRational(r+8);break;case33437:this.exif.FocalLength=this.getRational(r+8);break;case34850:this.exif.ISOSpeedRatings=this.getShort(r+8);break;case33439:this.exif.ExposureTime=this.getRational(r+8);break;case306:this.exif.DateTime=this.getString(r+8);break}}},EXIF.prototype.parseGPS=function(t){let e=this.getShort(t+4);for(let n=0;n<e;n++){let r=t+6+12*n,i=this.getShort(r);this.gps[i]=this.getRational(r+8)}}})();


const config = {
    srcImg: null,
    bgCustom: null,
    bgMode: "origin",
    scale:90,
    radius:20,
    shadow:0.5,
    frameW:80,
    blur:40,
    brandText:"",
    fontColor:"#ffffff",
    logoSize:35,
    batch:false,
    useExif:true,
    exifStr:"",
    make:"",model:""
}
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const emptyTip = document.getElementById('emptyTip');
const exifTip = document.getElementById('exifTip');


document.getElementById('imgInput').onchange = async e=>{
    const file = e.target.files[0];
    if(!file)return;
    document.getElementById('fileName').innerText = file.name;
    config.srcImg = await loadImg(file);
    emptyTip.style.display = 'none';
    canvas.style.display = 'block';


    EXIF.getData({files:[file]},ex=>{
        let mk = ex.image.Make||"";
        let md = ex.image.Model||"";
        let f = ex.exif.FNumber||"";
        let iso = ex.exif.ISOSpeedRatings||"";
        let s = ex.exif.ExposureTime||"";
        let fl = ex.exif.FocalLength||"";
        config.make = mk;config.model = md;
        let infoArr=[];
        if(mk)infoArr.push(mk.trim());
        if(md)infoArr.push(md.trim());
        if(f)infoArr.push(`f/${f}`);
        if(s)infoArr.push(`${s}s`);
        if(iso)infoArr.push(`ISO${iso}`);
        if(fl)infoArr.push(`${fl}mm`);
        config.exifStr = infoArr.join(" | ");
        exifTip.innerText = config.exifStr||"无EXIF参数";
        render();
    })
    render();
}

document.getElementById('customBgInput').onchange = async e=>{
    const f = e.target.files[0];
    if(!f)return;
    config.bgCustom = await loadImg(f);
    render();
}

document.getElementById('batchCheck').onchange = e=>{
    config.batch = e.target.checked;
    e.target.previousElementSibling.innerText = config.batch?"批量开启":"批量关闭";
}

document.getElementById('useExif').onchange=e=>{
    config.useExif = e.target.checked;render();
}

document.querySelectorAll('.mode-btn').forEach(btn=>{
    btn.onclick=()=>{
        document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        config.bgMode = btn.dataset.val;
        if(config.bgMode==='custom') document.getElementById('customBgInput').click();
        render();
    }
})

document.querySelectorAll('.tab-btn').forEach((b,i)=>{
    b.onclick=()=>{
        document.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        config.fontColor = i===0?"#fff":"#000";render();
    }
})

document.querySelectorAll('.brand').forEach(b=>{
    b.onclick=()=>{config.brandText = b.innerText;render();}
})


bindSlider('blur','blurVal','blur');
bindSlider('frameW','frameWVal','frameW');
bindSlider('scale','scaleVal','scale');
bindSlider('radius','radiusVal','radius');
bindSlider('shadow','shadowVal','shadow',v=>v/100);
bindSlider('logoSize','logoSizeVal','logoSize');


document.getElementById('downloadBtn').onclick = ()=>{
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = '相框成品.png';
    a.click();
}


function loadImg(file){
    return new Promise(res=>{
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = ()=>res(img);
    })
}
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


function render(){
    if(!config.srcImg)return;
    const img = config.srcImg;
    const pad = config.frameW;
    const totalW = img.width + pad*2;
    const totalH = img.height + pad*2;
    canvas.width = totalW; canvas.height = totalH;
    ctx.clearRect(0,0,totalW,totalH);


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


    ctx.fillStyle=config.fontColor;
    ctx.font=`bold ${config.logoSize}px sans-serif`;
    ctx.textAlign='center';
    let bottomText = "";
    if(config.useExif&&config.exifStr){
        bottomText = config.exifStr;
    }else if(config.brandText){
        bottomText = config.brandText;
    }
    if(bottomText){
        ctx.fillText(bottomText,totalW/2, totalH-pad/2);
    }
}
