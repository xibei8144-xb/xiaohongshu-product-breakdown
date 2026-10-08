const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const SKILL=path.resolve(__dirname,'..');
const args={};
for(let i=2;i<process.argv.length;i+=2){
 const flag=process.argv[i];
 if(!['--content','--assets','--out','--avatar','--brand'].includes(flag)||!process.argv[i+1])throw Error('Usage: node render.cjs --content content.json --assets assets-dir --out output-dir [--brand brand.json] [--avatar image]');
 args[flag.slice(2)]=path.resolve(process.argv[i+1]);
}
for(const key of ['content','assets','out'])if(!args[key])throw Error('Missing --'+key);
const ROOT=args.out,ASSETS=args.assets;let OUT,P;
fs.mkdirSync(ROOT,{recursive:true});
const cacheModule=path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
let canvasModule;
for(const candidate of [process.env.XHS_CANVAS_MODULE,'@napi-rs/canvas',cacheModule].filter(Boolean)){
 try{canvasModule=require(candidate);break;}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
}
if(!canvasModule)throw Error('Cannot load @napi-rs/canvas. Locate the local Node runtime or set XHS_CANVAS_MODULE.');
const {createCanvas,loadImage,GlobalFonts}=canvasModule;
function findFont(root){
 if(!fs.existsSync(root))return null;
 for(const item of fs.readdirSync(root,{withFileTypes:true})){
  const p=path.join(root,item.name);
  if(item.isFile()&&/^(PingFang|NotoSansCJK-Regular)\.(ttc|ttf|otf)$/.test(item.name))return p;
  if(item.isDirectory()){const f=findFont(p);if(f)return f;}
 }
 return null;
}
const fontPath=process.env.XHS_FONT_PATH ||
 ['/System/Library/Fonts/PingFang.ttc','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',path.join(process.env.WINDIR||'C:\\Windows','Fonts','msyh.ttc')].find(f=>fs.existsSync(f)) ||
 findFont('/System/Library/AssetsV2/com_apple_MobileAsset_Font8');
if(!fontPath||!GlobalFonts.registerFromPath(fontPath,'PF'))throw Error('Set XHS_FONT_PATH to an installed Chinese font file.');
const defaults={accountName:'',avatar:null,tagline:'',columnTitle:['AI 产品拆解','从功能到场景'],closingLine:''};
const supplied=args.brand?JSON.parse(fs.readFileSync(args.brand,'utf8')):{};
const BRAND={...defaults,...supplied};
for(const key of ['accountName','tagline','closingLine'])if(typeof BRAND[key]!=='string'||/[\r\n]/.test(BRAND[key]))throw Error('Brand '+key+' must be a single-line string.');
if(!Array.isArray(BRAND.columnTitle)||BRAND.columnTitle.length!==2||BRAND.columnTitle.some(s=>typeof s!=='string'))throw Error('columnTitle must contain two strings.');
if(BRAND.avatar!==null&&typeof BRAND.avatar!=='string')throw Error('avatar must be a path string or null.');
const AVATAR=args.avatar||(BRAND.avatar?path.resolve(path.dirname(args.brand),BRAND.avatar):null);
const footerLabel=[BRAND.accountName,BRAND.tagline].filter(Boolean).join(' · ');
const SIGNOFF=BRAND.closingLine||(BRAND.accountName?'我是 '+BRAND.accountName+'。':'');
const C={ink:'#26232D',muted:'#75717F',purple:'#47453E',pale:'#F2F0E8',line:'#E8E7E3',white:'#FFFFFF'};
let ctx,canvas,checks=[];const img={};
function font(size=28,weight=400,family='PF'){ctx.font=`${weight} ${size}px "${family}"`;ctx.textBaseline='top';}
function text(s,x,y,size=28,weight=400,color=C.ink,opts={}){font(size,weight,opts.family||'PF');ctx.fillStyle=color;ctx.textAlign=opts.align||'left';const w=ctx.measureText(s).width;if(opts.max&&w>opts.max+1)throw new Error(`Text too wide: ${s} ${w}/${opts.max}`);ctx.fillText(s,x,y);ctx.textAlign='left';const left=opts.align==='center'?x-w/2:opts.align==='right'?x-w:x;checks.push({text:s,x,y,w,size,left,right:left+w});return y+size;}
function para(s,x,y,w,size=28,lh=46,color=C.muted,weight=400){font(size,weight);let yy=y;for(const par of s.split('\n')){let line='';for(const ch of par){if(ctx.measureText(line+ch).width>w&&line){text(line,x,yy,size,weight,color);yy+=lh;line=ch}else line+=ch;}if(line){text(line,x,yy,size,weight,color);yy+=lh;}}return yy;}
function rr(x,y,w,h,r=12,fill=C.pale,stroke=null){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function line(x1,y,x2,color=C.line,width=1){ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function photo(name,x,y,w,h,crop=null,r=12){const im=img[name];ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();if(crop){ctx.drawImage(im,...crop,x,y,w,h)}else{const scale=Math.min(w/im.width,h/im.height);ctx.drawImage(im,x+(w-im.width*scale)/2,y+(h-im.height*scale)/2,im.width*scale,im.height*scale)}ctx.restore();}
function avatar(x,y,d){ctx.save();ctx.beginPath();ctx.arc(x+d/2,y+d/2,d/2,0,Math.PI*2);ctx.clip();const side=Math.min(img.avatar.width,img.avatar.height);ctx.drawImage(img.avatar,(img.avatar.width-side)/2,(img.avatar.height-side)/2,side,side,x,y,d,d);ctx.restore();}
function base(n,section){canvas=createCanvas(1080,1440);ctx=canvas.getContext('2d');ctx.fillStyle=C.white;ctx.fillRect(0,0,1080,1440);checks=[];if(n>1&&n<7){ctx.fillStyle=C.purple;ctx.fillRect(72,0,54,6);}text(n===1?BRAND.accountName:P.name,72,60,20,500,C.muted,{max:650});text(section,1008,60,20,500,n===1?C.muted:C.purple,{align:'right'});}
function head(kicker,l1,l2){circle(77,141,4,C.purple);text(kicker,97,123,23,500,C.ink);text(l1,72,188,64,600);text(l2,72,270,64,600,C.purple);}
function foot(n,source){if(source)text(source,72,1304,18,400,C.muted,{max:936});line(72,1350,1008);text(footerLabel,72,1375,19,400,C.muted,{max:810});text(`${String(n).padStart(2,'0')} / 07`,1008,1375,19,400,C.muted,{align:'right'});}
function save(n){
 const dangerous=checks.filter(t=>t.y+t.size>1430||t.y<0||t.left<0||t.right>1080);
 fs.writeFileSync(path.join(OUT,`../layout-${n}.json`),JSON.stringify({page:n,checks,dangerous},null,2));
 if(dangerous.length)throw new Error('Layout overflow '+n+': '+JSON.stringify(dangerous));
 fs.writeFileSync(path.join(OUT,`${String(n).padStart(2,'0')}.png`),canvas.toBuffer('image/png'));
}
function smallLabel(s,x,y){text(s,x,y,20,500,C.purple);}
function badge(s,x,y,w){rr(x,y,w,44,7);text(s,x+w/2,y+9,21,500,C.purple,{align:'center'});}
function arrow(x,y){text('→',x,y,32,400,C.purple);}


function brand(y,h=102){
 if(!BRAND.accountName&&!img.avatar)return;
 const d=img.avatar?62:0,gap=img.avatar&&BRAND.accountName?18:0;
 let size=35,m;
 do{font(size,600);ctx.textBaseline='alphabetic';m=ctx.measureText(BRAND.accountName);if(d+gap+m.width<=820)break;size--;}while(size>=20);
 if(d+gap+m.width>820)throw Error('Account name too long for brand capsule.');
 const gw=d+gap+m.width,w=Math.max(200,gw+70),x=540-w/2,sx=540-gw/2;
 rr(x,y,w,h,h/2,'#F1F4F9');
 if(img.avatar)avatar(sx,y+(h-d)/2,d);
 if(BRAND.accountName){
  ctx.fillStyle=C.ink;ctx.fillText(BRAND.accountName,sx+d+gap,y+h/2+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2);
 }
 ctx.textBaseline='top';
}

function cardRows(arr,y=1040){arr.forEach((a,i)=>{let yy=y+i*73;line(72,yy,1008);text(a[0],72,yy+22,29,600);text(a[1],201,yy+25,25,400,C.muted,{max:807});});}
(async()=>{
if(AVATAR)img.avatar=await loadImage(AVATAR);
const data=JSON.parse(fs.readFileSync(args.content));
if(!Array.isArray(data)||!data.length)throw Error('content must be a non-empty array');
const ids=new Set();
for(const product of data){
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(product.id)||ids.has(product.id))throw Error('Invalid or duplicate product id: '+product.id);
 ids.add(product.id);
 if(fs.existsSync(path.join(ROOT,product.id)))throw Error('Output already exists. Use a fresh output directory: '+product.id);
 for(const [field,count] of Object.entries({cards:4,rows:3,flow:3,who:3,limits:3,intro:2,flowtitle:2,end:2,feature:3,feature2:3})){
  if(!Array.isArray(product[field])||product[field].length!==count)throw Error(product.id+' needs '+count+' '+field+' entries for this layout; adapt the layout if needed.');
 }
 if(product.diagram&&product.diagram.length!==3)throw Error('diagram requires 3 rows in this layout');
 if(product.detailRows&&product.detailRows.length!==2)throw Error('detailRows requires 2 rows in this layout');
}
fs.writeFileSync(path.join(ROOT,'render-run.json'),JSON.stringify({content:args.content,assets:ASSETS,avatarSha256:AVATAR?require('node:crypto').createHash('sha256').update(fs.readFileSync(AVATAR)).digest('hex'):null},null,2));
for(P of data){OUT=path.join(ROOT,P.id,'images');fs.mkdirSync(OUT,{recursive:true});C.purple=P.color;C.pale=P.pale;
img.logo=await loadImage(path.resolve(ASSETS,P.logo));img.shot=await loadImage(path.resolve(ASSETS,P.shot));if(!P.diagram)img.shot2=await loadImage(path.resolve(ASSETS,P.shot2));
base(1,'AI PRODUCT NOTES');text(BRAND.columnTitle[0],540,193,61,600,C.ink,{align:'center',max:936});text(BRAND.columnTitle[1],540,281,61,600,C.ink,{align:'center',max:936});
text(P.name,540,463,P.name.length>8?91:116,600,C.ink,{align:'center',max:936});text(P.sub,540,628,27,400,C.muted,{align:'center',max:936});
ctx.save();ctx.shadowColor='rgba(30,29,25,0.36)';ctx.shadowBlur=28;ctx.shadowOffsetY=24;rr(420,772,240,240,54,'#FFFFFF');ctx.restore();rr(420,772,240,240,54,P.coverLogoBackground||'#FFFFFF');photo('logo',442,807,196,170,P.crop||null,0);
brand(1170);save(1);
base(2,'01 / 产品概述');head('它是什么',...P.intro);para(P.desc,72,375,936,29,47);
P.cards.forEach((a,i)=>{let x=72+i%2*480,y=542+Math.floor(i/2)*300;rr(x,y,456,271,16,i%3===0?C.pale:'#F6F8FB');smallLabel('0'+(i+1),x+27,y+24);text(a[0],x+27,y+70,34,600);para(a[1],x+27,y+142,402,26,45);});
text(P.note,72,1214,24,400,C.muted,{max:936});foot(2,'资料：产品官网与官方文档 · 功能以对应版本与配置为准');save(2);
base(3,'02 / 核心能力');head(...P.feature);para(P.fd,72,375,936,29,47);photo('shot',72,P.cropShot?627:517,936,P.cropShot?198:470,P.cropShot||null,14);text(P.shotlabel,72,1003,21,400,C.muted,{max:936});cardRows(P.rows,1061);foot(3,'图片：产品界面或官方展示 · 说明文字为编辑整理');save(3);
base(4,P.robot?'03 / 任务与评估':'03 / 使用流程');head(P.robot?'任务链路':'怎样使用',...P.flowtitle);para(P.flowdesc,72,375,936,29,47);
P.flow.forEach((a,i)=>{let y=535+i*211;rr(72,y,936,181,16,i===1?'#F6F8FB':C.pale);smallLabel('0'+(i+1),100,y+30);text(a[0],168,y+25,35,600);para(a[1],100,y+102,880,27,43);});line(72,1200,1008);text(P.point,72,1234,26,500,C.ink,{max:936});foot(4,P.page4Source||'使用路径与产品观察为编辑归纳');save(4);
base(5,'04 / 功能细节');head(...P.feature2);para(P.fd2,72,375,936,29,47);
if(P.diagram){
 P.diagram.forEach((a,i)=>{const y=530+i*202;rr(72,y,936,172,16,i===1?'#F7F8FA':C.pale);smallLabel('0'+(i+1),100,y+25);text(a[0],168,y+22,35,600);para(a[1],100,y+90,880,28,44);if(i<2)text('↓',534,y+175,24,400,C.purple);});
}else if(P.detailRows){
 photo('shot2',72,535,936,405,null,14);
 P.detailRows.forEach((a,i)=>{const y=963+i*84;line(72,y,1008);text(a[0],72,y+23,29,600);text(a[1],226,y+25,25,400,C.muted,{max:780});});
}else photo('shot2',72,515,936,635,null,14);
text(P.shotlabel2,72,1168,21,400,C.muted,{max:936});rr(72,1220,936,67,12,C.pale);text(P.take,94,1240,25,500,C.ink,{max:892});foot(5,P.diagram?'流程示意与产品观察为编辑整理':'素材性质以图注为准 · 产品观察为编辑整理');save(5);
base(6,'05 / 适用场景');head('适合谁','围绕具体任务，','判断它是否适合你。');
P.who.forEach((a,i)=>{let y=392+i*104;line(72,y,1008);text(a[0],72,y+29,31,600);text(a[1],312,y+33,25,400,C.muted,{max:696});});
rr(72,750,936,243,16,C.pale);smallLabel('可以这样开始 / 示例',99,778);para(P.prompt,99,834,882,28,48,C.ink);
text('使用时留意',72,1036,34,600);P.limits.forEach((s,i)=>{circle(77,1114+i*55,4,C.purple);text(s,99,1096+i*55,25,400,C.muted,{max:909});});foot(6,'场景与评估为编辑示例 · 具体能力需结合实际条件核对');save(6);
base(7,'产品拆解');P.end.forEach((s,i)=>text(s,540,260+i*120,76,600,C.ink,{align:'center'}));rr(367,504,346,10,5,C.pale);text('认识一个产品，也看清它适合做什么。',540,594,29,400,C.muted,{align:'center'});text('下一篇，继续拆解 AI 产品。',540,648,29,400,C.muted,{align:'center'});['点赞','收藏','关注'].forEach((s,i)=>{const x=186+i*237;rr(x,789,220,96,18,C.pale);text(s,x+110,813,44,600,C.purple,{align:'center'});});brand(1131);text(BRAND.tagline,540,1270,28,400,C.muted,{align:'center',max:936});save(7);
const researchNote=P.researchNote||'本篇根据官方资料整理；图片中的素材性质已标明，未独立实测。';
fs.writeFileSync(path.join(ROOT,P.id,'发布文案.md'),'# 标题\n'+P.title+'\n\n# 正文\n'+P.caption+'\n\n'+researchNote+(SIGNOFF?'\n'+SIGNOFF:'')+'\n\n# Tag\n'+P.tags+'\n\n# 资料来源\n'+P.sources.map(s=>'- '+s).join('\n'));
fs.writeFileSync(path.join(ROOT,P.id,'资料来源.md'),'# '+P.name+' 制作记录\n\n'+P.sources.map(s=>'- '+s).join('\n')+'\n\n'+researchNote+'\n'+(AVATAR?'头像使用原始文件，仅等比缩放和圆形裁切。':'本篇未配置头像。')+'素材类型以本篇图注及输入素材清单为准。\n7 张 1080×1440 PNG，无 HTML、无封面日期。');
const c=createCanvas(1080,720),x=c.getContext('2d');x.fillStyle='#EDEEF2';x.fillRect(0,0,1080,720);for(let n=1;n<=7;n++){let im=await loadImage(path.join(OUT,String(n).padStart(2,'0')+'.png'));x.drawImage(im,12+(n-1)%4*268,12+Math.floor((n-1)/4)*354,252,336);}fs.writeFileSync(path.join(ROOT,P.id,'overview.png'),c.toBuffer('image/png'));console.log(P.name+' done');
}
const cols=Math.min(data.length,4),rows=Math.ceil(data.length/cols);
const preview=createCanvas(cols*278+14,rows*388+12),pc=preview.getContext('2d');
pc.fillStyle='#EFF0F3';pc.fillRect(0,0,preview.width,preview.height);
for(let i=0;i<data.length;i++){
 const x=14+i%cols*278,y=12+Math.floor(i/cols)*388;
 pc.drawImage(await loadImage(path.join(ROOT,data[i].id,'images/01.png')),x,y,264,352);
 pc.fillStyle='#30313A';pc.font='16px PF';pc.textAlign='center';pc.fillText(data[i].name,x+132,y+375);
}
fs.writeFileSync(path.join(ROOT,'封面预览.png'),preview.toBuffer('image/png'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
