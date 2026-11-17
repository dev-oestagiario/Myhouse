import { expect, type Page } from '@playwright/test';
import type { HomeData } from '../../src/types';
import { initialHome } from '../../src/data';

const endpoint = 'http://127.0.0.1:54322';
const userId = '7b93241f-7e41-466c-ab1a-a0d1912126a8';
const email = 'usuario-teste@example.invalid';
export const initialFixture: HomeData = {
  ...structuredClone(initialHome),
  rooms: [{ id: 'room-sala', name: 'Sala de teste', width: 4.5, length: 3.2, height: 2.7, x: 0, z: 0 }],
  purchases: [],
  wallStages: {},
  logs: [],
};

type Snapshot = HomeData;
export type MockHome = { data: Snapshot; revision: number };

export async function setupMockSession(page: Page, seed: Snapshot = structuredClone(initialFixture), options:{failReads?:number;failWrites?:number;waitForHome?:boolean;beforeRead?:()=>Promise<void>}={}) {
  let failReads=options.failReads??0,failWrites=options.failWrites??0;
  const state: MockHome = { data: structuredClone(seed), revision: 1 };
  const session = {
    access_token: 'test-access',
    refresh_token: 'test-refresh',
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user: {
      id: userId, aud: 'authenticated', role: 'authenticated', email,
      app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: 'sb-127-auth-token', value: session });

  await page.route(`${endpoint}/**`, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,prefer,accept-profile,content-profile',
      'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
      'access-control-expose-headers': 'content-range,preference-applied',
      'content-type': 'application/json',
    };
    const respond = (status: number, body: unknown) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers }); return;
    }
    if (url.pathname === '/auth/v1/user') {
      await respond(200, session.user); return;
    }
    if (url.pathname.startsWith('/auth/v1/token')) {
      await respond(200, session); return;
    }
    if (url.pathname === '/rest/v1/user_homes') {
      if (method === 'GET') {
        if(options.beforeRead)await options.beforeRead();
        if(failReads>0){failReads--;await respond(400,{message:'Conexão de teste indisponível',code:'TEST_READ'});return;}
        await respond(200, { data: state.data, revision: state.revision });
        return;
      }
      if (method === 'PATCH' || method === 'POST') {
        if(failWrites>0){failWrites--;await respond(400,{message:'Falha de sincronização simulada',code:'TEST_WRITE'});return;}
        const payload = route.request().postDataJSON() as Partial<MockHome>;
        if (payload.data) state.data = payload.data;
        state.revision = Number(payload.revision || state.revision + 1);
        await respond(200, { revision: state.revision }); return;
      }
    }
    await respond(404, { message: 'Mock endpoint não configurado: ' + url.pathname });
  });
  await page.goto('/');
  if(options.waitForHome!==false)await expect(page.locator('#myhouse-page-content')).toBeVisible();
  return state;
}

export async function navigate(page: Page, label: string) {
  const open = page.getByRole('button', { name: 'Abrir menu' });
  if (await open.isVisible()) await open.click();
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: label, exact: true }).click();
}
