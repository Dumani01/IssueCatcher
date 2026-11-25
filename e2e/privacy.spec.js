import {test,expect} from '@playwright/test';import pg from 'pg';
if(!process.env.DATABASE_URL)process.loadEnvFile('backend/.env.test');
test('private draft is cleared when switching accounts',async({page,request})=>{
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();const stamp=Date.now(),emails=[`drafta${stamp}@example.test`,`draftb${stamp}@example.test`],password='DraftPrivacy123!Secure';
 try{
  await db.query('TRUNCATE auth_attempts');
  for(const email of emails){const r=await request.post('http://localhost:3002/api/auth/register',{headers:{Origin:'http://localhost:3002'},data:{name:'Privacy Test',email,password}});expect(r.status()).toBe(202)}
  async function login(email){await page.getByLabel('Correo',{exact:true}).fill(email);await page.getByLabel('Contraseña',{exact:true}).fill(password);await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:/Detect/})).toBeVisible()}
  await page.goto('/');await login(emails[0]);await page.getByRole('button',{name:'Mis notas',exact:true}).click();await page.getByLabel('Título',{exact:true}).fill('Private draft from A');await page.getByRole('textbox',{name:'Contenido',exact:true}).fill('Must not reach another account');await page.getByRole('button',{name:'Guardar',exact:true}).click();await expect(page.getByRole('heading',{name:'Private draft from A'})).toBeVisible();await page.getByRole('button',{name:'Editar',exact:true}).click();await expect(page.getByRole('textbox',{name:'Contenido',exact:true})).toHaveValue('Must not reach another account');
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();await expect(page.getByRole('heading',{name:'Iniciar sesión'})).toBeVisible();await login(emails[1]);await page.getByRole('button',{name:'Mis notas',exact:true}).click();await expect(page.getByLabel('Título',{exact:true})).toHaveValue('');await expect(page.getByRole('textbox',{name:'Contenido',exact:true})).toHaveValue('');await expect(page.getByText('Must not reach another account',{exact:true})).toHaveCount(0);
 }finally{await db.query('DELETE FROM users WHERE email=ANY($1::text[])',[emails]);await db.end()}
});
