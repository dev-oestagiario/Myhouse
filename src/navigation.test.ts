import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, parentRoute } from './navigation';

describe('mobile navigation',()=>{
  it('resolves list and details independently',()=>{
    expect(parseRoute('#/projects')).toEqual({page:'projects',projectId:null});
    expect(parseRoute('#/projects/abc')).toEqual({page:'projects',projectId:'abc'});
    expect(parseRoute('#/works')).toEqual({page:'works',projectId:null});
  });
  it('encodes ids and rejects malformed paths',()=>{
    const route={page:'projects',projectId:'A/B ç'} as const;
    expect(parseRoute(routeHash(route))).toEqual(route);
    expect(parseRoute('#/projects/%xx')).toEqual({page:'projects',projectId:null});
    expect(parseRoute('#/unknown')).toEqual({page:'overview',projectId:null});
    expect(parseRoute('#/projects/abc/extra')).toEqual({page:'projects',projectId:null});
    expect(parseRoute('#/shopping/abc')).toEqual({page:'shopping',projectId:null,itemId:'abc'});
  });
});

describe('F7.1 detail and section routes',()=>{
  it('opens purchase, room, task and scenario independently',()=>{
    expect(parseRoute('#/shopping/item-a')).toEqual({page:'shopping',projectId:null,itemId:'item-a'});
    expect(parseRoute('#/works/room-a')).toEqual({page:'works',projectId:null,itemId:'room-a'});
    expect(parseRoute('#/projects/proj-a/tarefas/job-a')).toEqual({page:'projects',projectId:'proj-a',section:'tarefas',detailId:'job-a'});
    expect(routeHash({page:'projects',projectId:'proj-a',section:'cenarios',detailId:'scenario-a'})).toBe('#/projects/proj-a/cenarios/scenario-a');
    expect(routeHash({page:'projects',projectId:'proj-a',section:'tarefas'})).toBe('#/projects/proj-a');
    expect(parseRoute('#/projects/new')).toEqual({page:'projects',projectId:null,create:true});
  });
});

describe('F7.2 physical back hierarchy',()=>{
  it('returns nested screens to their logical parent, including direct links',()=>{
    for(const [child,parent] of [
      ['#/projects/a/cenarios/b','#/projects/a/cenarios'],
      ['#/projects/a/tarefas/c','#/projects/a'],
      ['#/projects/a/orcamento','#/projects/a'],
      ['#/projects/a','#/projects'],
      ['#/projects/new','#/projects'],
      ['#/shopping/a','#/shopping'],
      ['#/works/a','#/works'],
      ['#/scan','#/works'],
      ['#/plan-editor','#/floorplan'],
      ['#/history','#/overview'],
    ]){
      expect(routeHash(parentRoute(parseRoute(child))!)).toBe(parent);
    }
    expect(parentRoute(parseRoute('#/overview'))).toBeNull();
  });
});
