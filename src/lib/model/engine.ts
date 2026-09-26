export type Assumptions = Record<string,number>;
export type Policy = {ta:number;voids:number;acquire:number;repairs:number};
export type Config = {openingTA:number;unitCost:number;envelope:number;assumptions:Assumptions};
export type Queue = {due:number;homes:number;eligible:number};
export type State = {year:number;ta:number;voids:number;backlog:number;retrofitPool:number;availableHomes:number;delivered:number;placements:number;retrofits:number;reserve:number;funding:number;totalCost:number;taCost:number;interventionCost:number;queue:Queue[]};
export type Year = {opening:State;state:State;policy:Policy;pressure:number;placements:number;delivered:number;committed:number;repairCompletions:number;retrofits:number;taCost:number;interventionCost:number;operatingCost:number;totalCost:number;available:number;funding:number;taShortfall:number};
export function initial(c:Config):State{return {year:0,ta:c.openingTA,voids:c.assumptions.voidPool,backlog:c.assumptions.repairBacklog,retrofitPool:c.assumptions.retrofitPool,availableHomes:0,delivered:0,placements:0,retrofits:0,reserve:0,funding:0,totalCost:0,taCost:0,interventionCost:0,queue:[]};}
export function validateConfig(c:Config){
 if(!Number.isFinite(c.openingTA)||c.openingTA<0||!Number.isFinite(c.unitCost)||c.unitCost<=0||!Number.isFinite(c.envelope)||c.envelope<0)throw Error('Invalid baseline');
 for(const [k,v] of Object.entries(c.assumptions))if(!Number.isFinite(v)||(k!=='growth'&&v<0))throw Error('Invalid assumption: '+k);
 if(c.assumptions.growth<=-1||c.assumptions.lag<1||!Number.isInteger(c.assumptions.lag)||c.assumptions.suitability>1||c.assumptions.repairShare>1)throw Error('Invalid timing or proportion');
 for(const k of ['voidCost','purchaseCost','repairCost','retrofitCost'])if(!(c.assumptions[k]>0))throw Error('Invalid unit cost');
}
export function stepYear(opening:State,policy:Policy,c:Config):Year{
 validateConfig(c);const a=c.assumptions,year=opening.year+1,available=c.envelope+opening.reserve;
 const allocations=Object.values(policy);if(allocations.some(v=>!Number.isFinite(v)||v<0)||allocations.reduce((s,v)=>s+v,0)>available+0.01)throw Error('Allocations exceed available envelope');
 // Mature queue -> shared reference pressure -> eligible placements -> stocks -> costs -> new commitments -> reserve/funding.
 const mature=opening.queue.filter(q=>q.due===year),queue=opening.queue.filter(q=>q.due>year).map(q=>({...q}));
 const delivered=mature.reduce((s,q)=>s+q.homes,0),capacity=opening.availableHomes+mature.reduce((s,q)=>s+q.eligible,0);
 const pressure=c.openingTA*((1+a.growth)**year-(1+a.growth)**(year-1));
 const need=Math.max(0,opening.ta+pressure),placements=Math.min(need,capacity),ta=need-placements;
 const voids=Math.min(opening.voids,a.voidCap,Math.floor(policy.voids/a.voidCost));
 const acquisitions=Math.min(a.acquireCap,Math.floor(policy.acquire/a.purchaseCost));
 if(voids+acquisitions>0)queue.push({due:year+a.lag,homes:voids+acquisitions,eligible:voids+Math.floor(acquisitions*a.suitability)});
 // Occupied-home repairs and retrofit finish this year and do not create housing placements.
 const repairCompletions=Math.min(opening.backlog+a.newRepairs,a.repairCap,Math.floor(policy.repairs*a.repairShare/a.repairCost));
 const retrofits=Math.min(opening.retrofitPool,a.retrofitCap,Math.floor(policy.repairs*(1-a.repairShare)/a.retrofitCost));
 const interventionCost=voids*a.voidCost+acquisitions*a.purchaseCost+repairCompletions*a.repairCost+retrofits*a.retrofitCost;
 const taCost=(opening.ta+ta)/2*c.unitCost,operatingCost=(opening.delivered+delivered)*a.operatingCost,totalCost=taCost+interventionCost+operatingCost;
 const funding=Math.max(0,totalCost-available),reserve=Math.max(0,available-totalCost);
 const state:State={year,ta,voids:opening.voids-voids,backlog:opening.backlog+a.newRepairs-repairCompletions,retrofitPool:opening.retrofitPool-retrofits,availableHomes:capacity-placements,delivered:opening.delivered+delivered,placements:opening.placements+placements,retrofits:opening.retrofits+retrofits,reserve,funding:opening.funding+funding,totalCost:opening.totalCost+totalCost,taCost:opening.taCost+taCost,interventionCost:opening.interventionCost+interventionCost,queue};
 return {opening:structuredClone(opening),state,policy:{...policy},pressure,placements,delivered,committed:voids+acquisitions,repairCompletions,retrofits,taCost,interventionCost,operatingCost,totalCost,available,funding,taShortfall:Math.max(0,taCost-policy.ta)};
}
export function runScenario(policy:Policy,c:Config):Year[]{let s=initial(c);return Array.from({length:5},()=>{const y=stepYear(s,policy,c);s=y.state;return y;});}
export function compare(player:Year[],baseline:Year[]){const p=player.at(-1)!.state,b=baseline.at(-1)!.state;return {householdDifference:b.ta-p.ta,additionalPlacements:p.placements-b.placements,grossAvoided:b.taCost-p.taCost,netSaving:b.totalCost-p.totalCost,interventionCost:p.interventionCost,homesDelivered:p.delivered,backlog:p.backlog,funding:p.funding};}
