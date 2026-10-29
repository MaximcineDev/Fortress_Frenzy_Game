// Bundled illustrated landmark atlases, with a procedural fallback. No network at runtime.
const cached=[];
export function cityBackground(scene,city){
 const key='city-background-'+city.id;
 if(!scene.textures.exists(key)){
  const tex=scene.textures.createCanvas(key,900,600);
  const atlasKey='city-atlas-'+(Math.floor((city.id-1)/6)+1);
  if(scene.textures.exists(atlasKey)){
    const image=scene.textures.get(atlasKey).getSourceImage(),index=(city.id-1)%6;
    const w=Math.floor(image.width/2),h=Math.floor(image.height/3);
    tex.context.drawImage(image,(index%2)*w,Math.floor(index/2)*h,w,h,0,0,900,600);
  }else drawCity(tex.context,city);
  tex.refresh();cached.push(key);
  while(cached.length>3){const old=cached.shift();if(old!==key&&scene.textures.exists(old))scene.textures.remove(old);}
 }
 return scene.add.image(450,300,key).setDisplaySize(900,600).setDepth(-20);
}
export function drawCity(c,city){
 let seed=city.id*991;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const night=[16,20,27,28].includes(city.id),water=city.terrain==='water',dry=city.terrain==='desert';
 const sky=c.createLinearGradient(0,0,0,450);city.sky.forEach((s,i)=>sky.addColorStop(i/2,s));c.fillStyle=sky;c.fillRect(0,0,900,600);
 const poly=(points,fill,stroke='#415363',width=2)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
 const rect=(x,y,w,h,fill,stroke=null)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.strokeRect(x,y,w,h);}};
 const ellipse=(x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();};
 const line=(points,color='#476076',width=3)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();};
 const star=(x,y,r,fill)=>poly(Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.43:r;return [x+Math.cos(a)*rr,y+Math.sin(a)*rr];}),fill,null);
 const windows=(x,y,w,h,step=13)=>{for(let a=x+5;a<x+w-4;a+=step)for(let b=y+7;b<y+h-3;b+=step)rect(a,b,4,6,night?'#f9d783':'#7992a0');};
 const building=(x,y,w,h,color='#aec2c6')=>{rect(x,y,w,h,color,'#56707d');rect(x+w-6,y+3,5,h-3,'#79929c');windows(x,y,w,h);};
 const spire=(x,base,h,w,color='#d8bc8c')=>{poly([[x-w,base],[x-w*.5,base-h*.65],[x,base-h],[x+w*.5,base-h*.65],[x+w,base]],color);for(let i=1;i<5;i++)line([[x-w*(1-i/5),base-h*i/6],[x+w*(1-i/5),base-h*i/6]],'#f3dbaf',2);};
 const dome=(x,y,r,color='#d5cdb9')=>{c.beginPath();c.arc(x,y,r,Math.PI,0);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle='#63727b';c.lineWidth=3;c.stroke();};
 const columns=(x,y,w,h,n,color='#e8d5b2')=>{rect(x,y,w,9,color);for(let i=0;i<n;i++){const xx=x+8+i*(w-25)/(n-1);rect(xx,y+9,9,h,color);rect(xx-3,y+8,15,6,'#f8e5c3');}rect(x-4,y+h+9,w+8,10,color);};
 const clockTower=(x,y,h)=>{building(x-24,y,48,h,'#c4a576');rect(x-31,y+12,62,46,'#ddc999','#725a42');ellipse(x,y+35,16,16,'#fff0ce');line([[x,y+24],[x,y+35],[x+10,y+40]],'#4d4943',2);spire(x,y,55,30,'#52646c');};
 const needle=(x,base,h,style)=>{const top=base-h;rect(x-5,top+65,10,h-65,'#bdc8c9','#637a87');rect(x-2,top,4,65,'#f0e1c5');if(style==='cn'){ellipse(x,top+85,31,12,'#9db4c1');rect(x-27,top+73,54,12,'#d8d8cb');ellipse(x,top+73,28,8,'#e9ddc2');ellipse(x,top+92,22,5,'#778b98');}else{rect(x-21,top+55,42,23,'#bac4c8','#566f83');ellipse(x,top+55,23,8,'#e0d7c6');line([[x-15,top+65],[x+15,top+65]],night?'#f3bb6c':'#5f849a',4);}};
 // Sun/moon, drifting-cloud shapes and layered distant hills.
 ellipse(704,145,night?23:38,night?23:38,night?'#f5e7cf':'#fff0bd');
 if(night)for(let i=0;i<50;i++)ellipse(60+rnd()*800,105+rnd()*130,.8+rnd(),.8,'#f4e7d2');
 for(let i=0;i<10;i++){const x=30+rnd()*840,y=120+rnd()*100;c.globalAlpha=.30;for(let j=0;j<4;j++)ellipse(x+j*24,y-(j%2)*9,32,12,'#fff4e4');c.globalAlpha=1;}
 poly([[0,325],[110,245],[215,298],[320,237],[455,290],[605,232],[745,279],[900,230],[900,450],[0,450]],dry?'#baaa88':'#89b1b5',null);
 poly([[0,360],[120,290],[235,332],[380,281],[520,323],[675,276],[800,330],[900,290],[900,460],[0,460]],dry?'#d5b98d':'#7b9e9d',null);
 // Distant skyline at small scale; landmarks stay centered and unobstructed by keeps.
 for(let i=0;i<27;i++){const x=i*35-8,w=22+rnd()*17,h=25+rnd()*60;rect(x,365-h,w,h,night?'#51698a':'#8da8b1');if(i%4===0)rect(x+w/2,365-h-13,2,14,'#8297a2');}
 rect(0,362,900,96,water?'#77b4c3':dry?'#dbbd8d':'#8eaf8b');
 if(water){for(let i=0;i<35;i++){const x=rnd()*900,y=370+rnd()*68;line([[x,y],[x+10+rnd()*35,y]],i%2?'#b9d9d3':'#629aa9',1.5);}}
 const stone='#d8c6a5',shade='#a49178',metal='#758fa0';
 c.save();
 switch(city.id){
 case 1: // Third Mainland Bridge: long low viaduct, not a suspension bridge.
  for(let i=0;i<15;i++){const x=125+i*46;poly([[x,350],[x+9,350],[x+15,401],[x-5,401]],'#b2bcb7');}
  poly([[80,341],[770,321],[817,333],[103,357]],'#d9d8c7');line([[95,340],[800,323]],'#617e88',4);line([[110,346],[799,330]],'#f5e5aa',2);
  for(let i=0;i<17;i++)line([[130+i*37,340-i],[130+i*37,321-i]],'#7a929a',2);break;
 case 2: // Aso Rock, rounded granite monolith and low Abuja skyline.
  c.beginPath();c.moveTo(245,350);c.bezierCurveTo(265,270,335,236,360,191);c.bezierCurveTo(386,149,495,160,532,200);c.bezierCurveTo(590,226,600,296,654,350);c.closePath();c.fillStyle='#9aada7';c.fill();c.strokeStyle='#708b86';c.lineWidth=4;c.stroke();
  line([[340,259],[390,211],[455,199],[515,235]],'#c6cec0',4);line([[434,240],[465,282],[520,300]],'#78918a',3);
  for(let i=0;i<8;i++)building(260+i*48,338-rnd()*30,36,26+rnd()*20,'#e3d5ba');break;
 case 3: // Black Star Gate.
  rect(330,276,36,107,stone,'#867e69');rect(534,276,36,107,stone,'#867e69');rect(320,257,260,32,stone,'#867e69');rect(328,250,244,8,'#f2e1ba');star(450,218,32,'#344549');rect(305,382,290,12,'#cab48b');break;
 case 4: // Saint Paul's Cathedral: tilted cross and swept roof.
  poly([[345,350],[620,350],[507,274],[385,288]],'#e6dcc0');line([[365,343],[480,288],[597,345]],'#99aeb0',4);poly([[312,352],[345,352],[407,190],[390,183]],'#e9e2ca');line([[387,206],[406,164]],'#e7dfc3',13);line([[365,177],[432,201]],'#e7dfc3',10);line([[400,230],[495,277],[590,335]],'#6c8e96',2);break;
 case 5: // African Renaissance Monument: family silhouette on coastal hill.
  poly([[200,402],[310,349],[403,329],[500,327],[620,362],[717,402]],'#75918b',null);rect(410,315,95,18,'#b6a780');
  poly([[429,317],[442,256],[466,230],[488,260],[493,317]],'#a5825c');ellipse(463,215,14,17,'#b39668');line([[450,249],[422,225],[404,198]],'#b39668',14);ellipse(400,187,8,9,'#b39668');line([[483,258],[515,285],[530,308]],'#ac906a',13);ellipse(508,263,10,12,'#ac906a');line([[463,290],[445,320]],'#c3a06b',10);break;
 case 6: // Giza pyramids.
  poly([[190,377],[338,205],[485,377]],'#dfba72');poly([[338,205],[485,377],[351,352]],'#b2915e');poly([[416,379],[565,241],[704,379]],'#eccb8a');poly([[565,241],[704,379],[570,356]],'#be9b66');poly([[623,380],[708,302],[791,380]],'#d5b379');for(let y=275;y<375;y+=15)line([[300-(y-275)*.8,y],[385+(y-275)*.55,y]],'#d4ad71',1);break;
 case 7: // AU headquarters: tall curved glass tower and conference dome.
  poly([[338,360],[338,221],[351,206],[414,210],[429,229],[429,360]],'#c5d6d3');for(let y=234;y<360;y+=12)line([[344,y],[423,y]],'#7197a4',3);for(let x=350;x<425;x+=15)line([[x,220],[x,358]],'#a4bfc5',2);dome(506,351,77,'#d6d7c6');rect(427,349,158,15,'#adbab5');break;
 case 8: // KICC cylinder, ribbed tower and saucer roof.
  rect(419,236,65,130,'#b3a382','#746e5b');ellipse(451,236,33,10,'#d8c6a0');for(let x=424;x<482;x+=9)line([[x,244],[x,363]],'#e0c7a0',3);ellipse(451,221,49,13,'#e6d3a9');rect(414,216,74,9,'#a68f73');poly([[339,368],[353,336],[401,327],[418,368]],'#c4ad83');break;
 case 9: needle(457,378,205,'hillbrow');building(275,320,85,58,'#b6b0a0');building(560,297,67,81,'#a7b0af');break;
 case 10: // Table Mountain: unmistakable broad flat summit.
  poly([[132,365],[255,257],[301,236],[604,236],[646,260],[780,365]],'#6f959e');poly([[237,335],[309,250],[600,250],[681,335]],'#8aacac',null);for(let x=310;x<620;x+=40)line([[x,259],[x-17,330]],'#75979b',3);c.globalAlpha=.45;ellipse(457,237,162,12,'#f3eee0');c.globalAlpha=1;break;
 case 11: clockTower(469,241,140);building(250,333,162,48,stone);spire(302,333,45,15,stone);spire(378,333,45,15,stone);break;
 case 12: // Eiffel Tower lattice and arched base.
  poly([[353,380],[420,282],[443,189],[457,189],[480,282],[548,380],[509,380],[450,314],[392,380]],'#937b70');line([[450,190],[450,164]],'#7f6f6b',4);rect(405,281,90,10,'#b39c82');rect(382,326,136,11,'#b39c82');for(let y=234;y<320;y+=20){const w=(y-175)*.35;line([[450-w,y],[450+w,y+18]],'#c7b39b',2);line([[450+w,y],[450-w,y+18]],'#c7b39b',2);}break;
 case 13: // Colosseum curved tiered arcade.
  ellipse(450,295,153,24,'#e1c49a');rect(297,295,306,82,'#c3a17b');ellipse(450,377,153,19,'#c3a17b');for(let row=0;row<3;row++)for(let i=0;i<12;i++){const x=308+i*24,y=299+row*25;rect(x,y+6,13,15,'#7d827b');dome(x+6.5,y+6,6.5,'#7d827b');}for(let y=318;y<377;y+=25)line([[301,y],[599,y]],'#ecd7b1',4);break;
 case 14: for(const [x,h,w] of [[370,163,19],[416,188,19],[486,188,19],[532,163,19]]){spire(x,378,h,w,stone);ellipse(x,378-h-5,5,7,'#dfb978');}poly([[355,378],[355,302],[451,260],[548,302],[548,378]],'#c1aa90');for(let x=382;x<530;x+=34)spire(x,378,90,12,'#d5bd9d');break;
 case 15: // Bosphorus suspension span plus domed skyline.
  for(const x of [303,599]){rect(x-5,231,10,153,'#b8c6c5');rect(x-14,248,28,8,'#d9dbca');}
  c.beginPath();c.moveTo(200,317);c.quadraticCurveTo(260,300,303,247);c.quadraticCurveTo(450,377,599,247);c.quadraticCurveTo(650,300,721,316);c.strokeStyle='#dce1d7';c.lineWidth=3;c.stroke();rect(196,328,530,8,'#c6cabc');for(let x=319;x<590;x+=25)line([[x,290+Math.sin((x-303)/296*Math.PI)*24],[x,328]],'#a8bec4',1);dome(703,333,30);spire(752,358,92,7);break;
 case 16: // Burj Khalifa stepped glass spire.
  for(let i=0;i<8;i++){const width=94-i*10,top=356-i*25;rect(450-width/2,top-32,width,393-top,'#9eb7c6','#586e89');for(let y=top-25;y<380;y+=12)line([[450-width/2+3,y],[450+width/2-3,y]],'#d4d9cc',1);}
  line([[450,172],[450,139]],'#dde4df',3);building(300,282,50,97,'#a7b8c4');building(565,302,70,77,'#c3c2b7');break;
 case 17: // Gateway of India: arch with four turrets.
  rect(335,279,230,100,stone,'#86785e');c.save();c.beginPath();c.rect(335,279,230,100);c.moveTo(410,379);c.lineTo(410,330);c.arc(450,330,40,Math.PI,0);c.lineTo(490,379);c.closePath();c.clip('evenodd');rect(335,279,230,100,stone);c.restore();
  // Paint open central arch in the waterfront colour.
  rect(411,333,78,47,'#9ec5c6');dome(450,333,39,'#9ec5c6');for(const x of [340,380,520,560]){rect(x-8,261,16,116,'#cbb68f');dome(x,261,12,'#e7d1a7');}rect(329,278,242,13,'#ead5af');break;
 case 18: for(const [x,h,w] of [[340,113,22],[390,150,24],[450,213,32],[511,150,24],[560,113,22]])spire(x,380,h,w,'#e8d1ad');for(let y=241;y<370;y+=21)rect(426-(y-241)*.1,y,48+(y-241)*.2,5,'#b79b83');break;
 case 19: // Temple of Heaven circular tiered blue roofs.
  rect(350,370,200,12,'#ded5bd');rect(385,313,130,57,'#c18e7b');for(const [y,w] of [[313,190],[278,145],[246,96]]){poly([[450,y-31],[450+w/2,y],[450-w/2,y]],'#4d8aa4');line([[450-w/2,y],[450+w/2,y]],'#ded2ae',4);rect(450-w*.32,y+2,w*.64,20,'#c89f82');}ellipse(450,209,5,8,'#f6cd7f');break;
 case 20: // Tokyo Tower, red-and-white lattice.
  poly([[382,382],[421,286],[445,198],[455,198],[479,286],[518,382],[494,382],[450,309],[405,382]],'#c86c5f');for(let y=235;y<365;y+=27){const w=(y-175)*.32;line([[450-w,y],[450+w,y+20]],'#f3ddd0',3);line([[450+w,y],[450-w,y+20]],'#f3ddd0',3);}rect(422,279,56,16,'#e8ddd1');rect(439,218,22,13,'#e8ddd1');line([[450,198],[450,170]],'#dbd4c4',4);break;
 case 21: // Statue of Liberty with crown and lifted torch.
  rect(418,352,68,31,'#b1b8a7');poly([[420,350],[434,269],[459,267],[482,350]],'#81aca0');ellipse(447,249,13,16,'#81aca0');for(let i=0;i<5;i++)line([[437+i*5,238],[431+i*8,225]],'#83b3a4',3);line([[435,280],[407,235],[403,206]],'#80aa9b',11);rect(395,196,16,12,'#92b8a3');ellipse(403,187,5,11,'#ffe3a1');line([[460,283],[482,303]],'#83afa0',12);rect(472,282,15,31,'#95b7a2');break;
 case 22: // US Capitol dome and colonnaded wings.
  columns(293,323,314,45,16);rect(404,289,92,44,stone);dome(450,289,46,'#e6deca');rect(444,226,12,21,'#ded8c6');ellipse(450,222,4,6,'#cec7b3');for(let x=414;x<492;x+=12)line([[x,290],[x,324]],'#b1b4ac',2);break;
 case 23: // Angel of Independence.
  rect(407,366,85,16,stone);rect(437,265,26,101,'#dac6aa');ellipse(450,265,21,7,'#dccaab');rect(440,248,20,15,'#c5b090');ellipse(450,231,7,9,'#e5bd68');poly([[441,243],[444,219],[423,204],[407,201],[427,232]],'#eac879');poly([[454,239],[461,218],[484,201],[478,222]],'#eac879');break;
 case 24: // Christ the Redeemer on Corcovado, open arms.
  poly([[256,403],[350,333],[421,274],[472,282],[560,344],[655,403]],'#668d7c',null);poly([[425,304],[434,236],[465,236],[476,304]],'#d1d5c5');ellipse(450,223,10,13,'#e2dfca');poly([[435,237],[391,227],[384,237],[437,255]],'#d1d5c5');poly([[463,237],[510,227],[516,237],[461,255]],'#d1d5c5');break;
 case 25: // Buenos Aires obelisk with radiating avenues.
  poly([[430,378],[434,218],[450,194],[466,218],[470,378]],'#e4dcc3');poly([[450,194],[466,218],[470,378],[451,378]],'#c2bdaa',null);line([[245,405],[450,366],[655,405]],'#d5c5a6',13);rect(445,247,10,17,'#7f979b');break;
 case 26: // Sydney Opera House sculptural sails.
  rect(305,375,315,12,stone);for(const [x,y,w,h] of [[325,370,80,66],[379,370,100,114],[458,370,88,88],[520,370,70,58]]){c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+w*.7,y-h,x+w,y-h);c.quadraticCurveTo(x+w*.8,y-20,x+w*.6,y);c.closePath();c.fillStyle='#f0e7d0';c.fill();c.strokeStyle='#9aadae';c.lineWidth=3;c.stroke();line([[x+12,y-5],[x+w*.9,y-h+12]],'#d2d4c7',2);}break;
 case 27: // Marina Bay Sands three towers and rooftop ship.
  for(const x of [346,434,522]){building(x,266,41,112,'#abbcc9');line([[x+10,268],[x+10,375]],'#d9dccc',3);}
  c.beginPath();c.moveTo(327,260);c.bezierCurveTo(400,252,540,251,589,250);c.quadraticCurveTo(588,272,558,278);c.lineTo(353,278);c.closePath();c.fillStyle='#d3d3bb';c.fill();line([[342,256],[571,253]],'#a9c887',6);break;
 case 28: // N Seoul Tower atop Namsan, mountains behind.
  poly([[240,411],[352,350],[411,312],[468,310],[548,354],[678,411]],'#6a8d83',null);needle(450,330,163,'seoul');ellipse(450,221,19,9,'#d5d6cd');break;
 case 29: needle(450,383,222,'cn');dome(590,377,66,'#b4c5cc');rect(524,375,135,9,'#cbd9db');building(285,292,55,91,'#b5c5d0');break;
 case 30: // Parthenon on the Acropolis.
  poly([[245,408],[296,356],[366,333],[572,334],[647,365],[700,408]],'#b8a88b',null);columns(340,281,220,69,9,'#ecd7ae');poly([[329,281],[450,243],[571,281]],'#dec79d');poly([[346,278],[450,253],[554,278]],'#bea683',null);rect(331,357,239,12,'#cfb58d');break;
 }
 c.restore();
 // Atmospheric veil settles the landmarks into the background.
 c.fillStyle=night?'rgba(21,42,70,.10)':'rgba(231,237,219,.08)';c.fillRect(0,100,900,302);
 // Foreground meadow / sandy road keeps the battlefield at the same coordinates.
 const ground=c.createLinearGradient(0,404,0,515);ground.addColorStop(0,dry?'#c6a971':'#79996d');ground.addColorStop(1,dry?'#a78453':'#42684d');c.fillStyle=ground;c.fillRect(0,416,900,184);
 poly([[362,416],[535,416],[670,600],[230,600]],dry?'#dfc18b':'#c2b184',null);
 for(let i=0;i<100;i++){const x=rnd()*900,y=425+rnd()*94;if(x>345-(y-416)*.7&&x<550+(y-416)*.7)continue;line([[x,y],[x-3,y-5],[x+1,y-2],[x+5,y-6]],dry?'#b69357':'#789b68',1);}
 // Stylised framing trees, palms or blossom branches at the sides.
 for(const x of [20,872]){
  line([[x,458],[x+(x<450?25:-25),330]],'#665b47',10);
  if(dry||water){for(let i=0;i<5;i++){const xx=x+(x<450?25:-25),yy=330;line([[xx,yy],[xx+(i-2)*22,yy-20+Math.abs(i-2)*8]],'#678d70',8);}}
  else for(let i=0;i<5;i++)ellipse(x+(i%3-1)*22,326-Math.floor(i/3)*24,29,22,[12,20,28].includes(city.id)?'#d8b6c0':'#64876d');
 }
 // A little hand-painted grain, deterministic per city, without noisy foreground detail.
 for(let i=0;i<750;i++){c.fillStyle=i%2?'rgba(255,241,205,.035)':'rgba(15,40,55,.025)';c.fillRect(rnd()*900,100+rnd()*408,1+rnd()*3,1);}
}
