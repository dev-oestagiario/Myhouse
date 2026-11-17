import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash } from './navigation';

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
    expect(parseRoute('#/shopping/abc')).toEqual({page:'shopping',projectId:null});
  });
});
