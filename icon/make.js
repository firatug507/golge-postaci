const puppeteer=require('puppeteer-core'); const fs=require('fs');
(async()=>{const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
const p=await b.newPage(); await p.goto('file:///workspace/golge-postaci/icon/icon.html');
const dens={mdpi:1,hdpi:1.5,xhdpi:2,xxhdpi:3,xxxhdpi:4};
for(const [d,m] of Object.entries(dens)){ const dir='/workspace/golge-postaci/android/res/mipmap-'+d; fs.mkdirSync(dir,{recursive:true});
 const leg=await p.evaluate(s=>draw(s,false),Math.round(48*m)); fs.writeFileSync(dir+'/ic_launcher.png',Buffer.from(leg.split(',')[1],'base64'));
 const fg=await p.evaluate(s=>draw(s,true),Math.round(108*m)); fs.writeFileSync(dir+'/ic_launcher_fg.png',Buffer.from(fg.split(',')[1],'base64'));}
const big=await p.evaluate(s=>draw(s,false),512); fs.writeFileSync('/workspace/golge-postaci/icon/icon_512.png',Buffer.from(big.split(',')[1],'base64'));
await b.close();})();
