import test from 'node:test';import assert from 'node:assert/strict';
import {canPublish,canEdit,isAdmin,type Actor} from '../lib/permissions.ts';
const ordinary:Actor={id:'member',email:'member@test.example',name:'Member',bio:'',avatarId:'',role:'member',publishStatus:'none',status:'active'};
test('ordinary users cannot publish until approved',()=>{assert.equal(canPublish(ordinary),false);assert.equal(canPublish({...ordinary,publishStatus:'approved'}),true);assert.equal(canPublish({...ordinary,publishStatus:'revoked'}),false)});
test('an approved author cannot edit another user content',()=>{const author={...ordinary,publishStatus:'approved'};assert.equal(canEdit(author,'member'),true);assert.equal(canEdit(author,'another'),false)});
test('administration does not grant permission to rewrite others work',()=>{const admin={...ordinary,role:'admin'} as Actor;assert.equal(isAdmin(admin),true);assert.equal(canPublish(admin),true);assert.equal(canEdit(admin,'another'),false)});
test('suspended users cannot publish even with admin role',()=>{assert.equal(canPublish({...ordinary,role:'admin',status:'banned'}),false);assert.equal(canEdit({...ordinary,publishStatus:'approved',status:'banned'},'member'),false)});
