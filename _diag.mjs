import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import { loadLayersModel } from '@tensorflow/tfjs-layers';
import { decode as decodeJpeg } from 'jpeg-js';
import fs from 'fs'; import path from 'path';

const root='assets/model';
const json=JSON.parse(fs.readFileSync(root+'/model.json','utf8'));
const meta=JSON.parse(fs.readFileSync(root+'/metadata.json','utf8'));
const bin=fs.readFileSync(root+'/weights.bin');
const wd=bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength);
await tf.setBackend('cpu'); await tf.ready();
const model=await loadLayersModel({load:async()=>({modelTopology:json.modelTopology,weightSpecs:json.weightsManifest.flatMap(g=>g.weights),weightData:wd})});
const L=meta.labels, N=224;
console.log('model labels:',JSON.stringify(L),'\n');

function tensor(px,w,h){const a=new Float32Array(N*N*3);
 for(let y=0;y<N;y++){const sy=Math.min(h-1,(y*h/N)|0);
  for(let x=0;x<N;x++){const sx=Math.min(w-1,(x*w/N)|0);const s=(sy*w+sx)*4,d=(y*N+x)*3;
   a[d]=px[s]/127.5-1;a[d+1]=px[s+1]/127.5-1;a[d+2]=px[s+2]/127.5-1;}}
 return tf.tensor4d(a,[1,N,N,3]);}

const folders={'Jacket':'Jacket','Shirt':'Shirt','T-shirt':'Tee','Polo shirt':'Shirt','Tank top':'Tee','Warm clothes':'Hoodies'};
const base='dataset/clothes-1/Dataset';
let grand=0, grandOk=0;
for(const [folder,expect] of Object.entries(folders)){
  const dir=path.join(base,folder);
  if(!fs.existsSync(dir)) continue;
  const files=fs.readdirSync(dir).filter(f=>/\.(jpe?g)$/i.test(f)).slice(0,25);
  let ok=0,n=0,fail=0; const hist={};
  for(const f of files){
    try{
      const raw=decodeJpeg(fs.readFileSync(path.join(dir,f)),{useTArray:true,formatAsRGBA:true});
      const x=tensor(raw.data,raw.width,raw.height);
      const out=model.predict(x); const s=await out.data(); out.dispose(); x.dispose();
      let bi=0; for(let i=1;i<s.length;i++) if(s[i]>s[bi]) bi=i;
      hist[L[bi]]=(hist[L[bi]]||0)+1; n++; if(L[bi]===expect) ok++;
    }catch(e){fail++;}
  }
  grand+=n; grandOk+=ok;
  const pct = n? (ok/n*100).toFixed(0):'-';
  console.log(`${folder.padEnd(13)} expect ${expect.padEnd(8)} ${ok}/${n} correct (${pct}%)  decodeFail=${fail}  ${JSON.stringify(hist)}`);
}
console.log(`\nOVERALL: ${grandOk}/${grand} = ${grand?(grandOk/grand*100).toFixed(1):0}%`);
