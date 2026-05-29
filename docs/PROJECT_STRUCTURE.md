# Mo ta cau truc du an Real Estate Transaction Platform

Tai lieu nay mo ta muc dich cua tung thu muc/file trong du an, ly do tach cau truc nhu hien tai va cach tiep tuc phat trien de dap ung yeu cau do an Lap trinh Web INT1334 cho de tai san giao dich bat dong san.

## 1. Tong quan kien truc

Du an duoc tach thanh 2 ung dung rieng:

- `frontend/`: ung dung Next.js App Router, hien thi giao dien nguoi dung, form dang bai, tim kiem bat dong san, ban do, chat tu van va cac trang quan tri.
- `backend/`: ung dung Node.js/ExpressJS, cung cap REST API, xac thuc JWT, CRUD du lieu bat dong san, chat realtime, upload anh va ket noi database thong qua Prisma.

Ly do tach frontend/backend:

- De dung dung yeu cau do an: NextJS App Router + NodeJS/ExpressJS API.
- De deploy doc lap: frontend len Vercel, backend len Render/Railway, database len Supabase/PostgreSQL.
- De phan cong nhom ro hon: thanh vien frontend lam UI/UX, thanh vien backend lam API/database/auth/realtime.

## 2. So do thu muc hien tai

```text
Accommodation_Platform/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.ts
│   │   ├── prisma/
│   │   │   └── prisma.service.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   └── page.tsx
│   ├── .env.example
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.mjs
│   ├── proxy.ts
│   └── tsconfig.json
├── docs/
│   └── PROJECT_STRUCTURE.md
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 3. Thu muc goc `Accommodation_Platform/`

Thu muc goc la noi quan ly toan bo monorepo cua du an.

### `.gitignore`

Dung de loai bo cac file khong nen dua len GitHub:

- `node_modules/`: thu vien cai bang npm, co the cai lai bang `npm install`.
- `.next/`, `dist/`, `build/`: output build, khong can commit.
- `.env`, `.env.local`: chua secret/key that, khong duoc public.
- `coverage/`, `*.log`, `uploads/`: file phat sinh khi chay/test app.

Muc dich: giu repository gon, tranh lo key that va tranh commit file build nang.

### `README.md`

File gioi thieu nhanh ve du an. Sau nay nen bo sung:

- Ten de tai.
- Thanh vien nhom.
- Cong nghe su dung.
- Huong dan cai dat local.
- Link frontend/backend deploy.
- Tai khoan demo.

### `docker-compose.yml`

Hien dang la file trong. Sau nay nen dung de khai bao cac service local nhu PostgreSQL.

Vi du muc tieu:

```text
docker-compose.yml
└── postgres service
    ├── image: postgres
    ├── database: real_estate_platform
    └── port: 5432
```

Muc dich: thanh vien trong nhom co the chay cung mot database local ma khong can cai PostgreSQL thu cong.

## 4. Backend `backend/`

Backend la Express API server. No phu trach logic nghiep vu va du lieu cua san giao dich bat dong san.

### `backend/package.json`

Khai bao dependency va script cho backend.

Nhom dependency chinh:

- `express`: tao REST API.
- `@prisma/client`, `prisma`: ORM ket noi PostgreSQL.
- `jsonwebtoken`: tao access token va refresh token.
- `bcryptjs`: bam mat khau nguoi dung.
- `zod`: validate input API.
- `socket.io`: chat realtime giua nguoi mua/nguoi ban/tu van vien.
- `multer`, `cloudinary`: upload anh bat dong san.
- `nodemailer`: gui email thong bao/xac thuc/lich hen.
- `helmet`, `cors`, `cookie-parser`: middleware bao mat va xu ly request.
- `vitest`: viet unit test backend.

Script quan trong:

```bash
npm run dev
npm run build
npm start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm test
```

### `backend/.env.example`

File mau bien moi truong cho backend. File nay duoc commit de cac thanh vien biet can cau hinh gi, nhung khong chua secret that.

Cac bien quan trong:

- `DATABASE_URL`: chuoi ket noi PostgreSQL.
- `PORT`: cong backend, mac dinh nen dung `4000`.
- `CLIENT_URL`: URL frontend de cau hinh CORS.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: khoa ky token.
- `CLOUDINARY_*`: cau hinh upload anh.
- `SMTP_*`: cau hinh gui email.

Khi chay local, tao file `.env` dua tren `.env.example`.

### `backend/tsconfig.json`

Cau hinh TypeScript cho backend:

- Source code nam trong `src/`.
- File build xuat ra `dist/`.
- Dung module `NodeNext` de phu hop voi `"type": "module"`.
- Bat `strict` de giam loi type.

### `backend/prisma/`

Thu muc quan ly database schema va migration.

#### `backend/prisma/schema.prisma`

Noi khai bao:

- Provider database: PostgreSQL.
- Prisma client generator.
- Cac model du lieu.

Voi de tai bat dong san, cac entity nen co:

- `User`: nguoi dung, admin, moi gioi/agent.
- `Property`: tin bat dong san.
- `PropertyImage`: anh cua tin.
- `Category`: loai BDS, vi du can ho, nha pho, dat nen.
- `Favorite`: tin da luu.
- `Conversation`: phong chat tu van.
- `Message`: tin nhan realtime.
- `Appointment`: lich hen xem nha.
- `Transaction`: giao dich/dat coc/mock payment neu can.

Cach lam:

1. Viet model trong `schema.prisma`.
2. Chay `npm run prisma:migrate` de tao migration.
3. Chay `npm run prisma:generate` de cap nhat Prisma Client.
4. Dung Prisma Client trong service/controller.

### `backend/src/`

Thu muc chua source code backend.

#### `backend/src/server.ts`

Entry point cua backend.

Muc dich:

- Nap app Express tu `app.ts`.
- Tao HTTP server.
- Gan Socket.io neu co chat realtime.
- Lang nghe port tu `.env`.

Sau nay file nay nen chua logic khoi dong server, khong nen chua logic CRUD.

#### `backend/src/app.ts`

Noi cau hinh Express application.

Muc dich:

- Gan middleware: `cors`, `helmet`, `express.json`, `cookie-parser`.
- Gan route prefix: `/api/auth`, `/api/properties`, `/api/users`, ...
- Gan middleware xu ly loi tap trung.
- Gan health check endpoint: `/health`.

Sau nay file nay nen chi lam cau hinh app, khong viet truc tiep logic database.

#### `backend/src/config/`

Chua cau hinh cac dich vu ngoai he thong.

##### `backend/src/config/supabase.ts`

Hien la file placeholder. Neu dung Supabase PostgreSQL hoac Supabase Storage, file nay dung de tao client/cau hinh ket noi Supabase.

Neu upload anh bang Cloudinary thay vi Supabase Storage, co the doi/thay bang:

```text
backend/src/config/cloudinary.ts
```

#### `backend/src/prisma/`

Chua Prisma service/client dung chung cho backend.

##### `backend/src/prisma/prisma.service.ts`

Muc dich:

- Tao mot instance Prisma Client dung lai toan backend.
- Tranh moi controller tao Prisma Client rieng.
- Ho tro dong ket noi khi app shutdown/test.

## 5. Frontend `frontend/`

Frontend la Next.js App Router application. No phu trach UI, routing, form validation, state management va goi API backend.

### `frontend/package.json`

Khai bao dependency va script cho frontend.

Nhom dependency chinh:

- `next`, `react`, `react-dom`: nen tang frontend.
- `tailwindcss`, `@tailwindcss/postcss`: styling.
- `react-hook-form`, `zod`, `@hookform/resolvers`: form va validation.
- `zustand`: global state, vi du auth state, compare list, favorite cache.
- `leaflet`, `react-leaflet`: hien thi ban do vi tri bat dong san.
- `socket.io-client`: ket noi chat realtime voi backend.
- `lucide-react`: icon UI.

Script quan trong:

```bash
npm run dev
npm run build
npm start
npm run lint
```

### `frontend/.env.example`

File mau bien moi truong cho frontend.

- `NEXT_PUBLIC_API_URL`: URL REST API backend.
- `NEXT_PUBLIC_SOCKET_URL`: URL Socket.io backend.

Vi co prefix `NEXT_PUBLIC_`, cac bien nay co the duoc doc tren browser. Khong dat secret that trong frontend.

### `frontend/app/`

Thu muc App Router cua Next.js. Moi folder/file trong day tao nen route, layout va UI state dac biet.

#### `frontend/app/layout.tsx`

Root layout cua toan bo frontend.

Muc dich:

- Khai bao HTML shell.
- Import global CSS.
- Khai bao metadata mac dinh.
- Sau nay co the boc provider chung: auth provider, theme provider, React Query provider, Zustand hydration neu can.

#### `frontend/app/page.tsx`

Trang chu `/`.

Hien tai la landing/placeholder cho san giao dich BDS. Sau nay nen phat trien thanh:

- Thanh tim kiem nhanh.
- Danh sach BDS noi bat.
- Bo loc khu vuc/khoang gia/loai nha.
- CTA dang bai.

#### `frontend/app/loading.tsx`

UI loading mac dinh cho route segment.

Muc dich:

- Hien thi trang dang tai khi Next dang render/fetch data.
- Cai thien UX khi chuyen trang hoac dung Suspense.

#### `frontend/app/error.tsx`

Error boundary cua App Router.

Muc dich:

- Bat loi render trong route.
- Hien nut thu lai.
- Bat buoc la Client Component vi co su kien click `reset()`.

#### `frontend/app/globals.css`

CSS global cua du an.

Hien tai import Tailwind:

```css
@import "tailwindcss";
```

Sau nay co the them:

- Theme token.
- Base style cho body.
- Utility global neu that su can.

### `frontend/proxy.ts`

File proxy/middleware convention moi cua Next.

Muc dich hien tai:

- Cho phep Next xu ly request qua proxy function.
- Sau nay co the dung de bao ve route can dang nhap, vi du `/dashboard`, `/admin`, `/messages`.

Vi du muc tieu:

```text
Neu user chua co token va vao /admin
-> redirect sang /login
```

### `frontend/next.config.ts`

Cau hinh Next.js.

Hien tai:

- Cau hinh `turbopack.root` de Next khong nham workspace root.
- Cho phep load anh tu `res.cloudinary.com` bang `next/image`.

### `frontend/postcss.config.mjs`

Cau hinh PostCSS cho Tailwind CSS.

Muc dich: giup Next build va bien dich Tailwind.

### `frontend/tsconfig.json`

Cau hinh TypeScript cho frontend.

Muc dich:

- Bat `strict`.
- Ho tro JSX/React.
- Ho tro alias `@/*`.
- Include type Next sinh ra trong `.next/types`.

### `frontend/next-env.d.ts`

File type do Next tao ra. Khong nen sua thu cong.

## 6. Cau truc nen mo rong tiep theo

De dap ung dung rubric do an, nen mo rong backend/frontend theo cau truc sau.

### Backend de xuat

```text
backend/src/
├── config/
│   ├── cloudinary.ts
│   ├── env.ts
│   └── mail.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── property.controller.ts
│   ├── user.controller.ts
│   ├── favorite.controller.ts
│   └── conversation.controller.ts
├── middlewares/
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── role.middleware.ts
│   └── validate.middleware.ts
├── routes/
│   ├── auth.route.ts
│   ├── property.route.ts
│   ├── user.route.ts
│   ├── favorite.route.ts
│   └── conversation.route.ts
├── services/
│   ├── auth.service.ts
│   ├── property.service.ts
│   ├── user.service.ts
│   ├── upload.service.ts
│   └── mail.service.ts
├── sockets/
│   └── chat.socket.ts
├── validations/
│   ├── auth.schema.ts
│   └── property.schema.ts
├── utils/
│   ├── api-response.ts
│   └── jwt.ts
├── app.ts
└── server.ts
```

Nguyen tac lam backend:

- `routes/`: khai bao endpoint va middleware.
- `controllers/`: nhan request, goi service, tra response.
- `services/`: xu ly nghiep vu va goi Prisma.
- `validations/`: Zod schema validate body/query/params.
- `middlewares/`: auth, role, validate, error handler.
- `sockets/`: xu ly realtime chat.
- `utils/`: helper dung chung.

### Frontend de xuat

```text
frontend/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── properties/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (user)/
│   │   ├── dashboard/page.tsx
│   │   ├── favorites/page.tsx
│   │   └── messages/page.tsx
│   ├── (admin)/
│   │   └── admin/page.tsx
│   ├── actions/
│   │   └── property.actions.ts
│   ├── api/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── properties/
│   ├── forms/
│   ├── map/
│   ├── chat/
│   └── ui/
├── lib/
│   ├── api.ts
│   ├── socket.ts
│   └── utils.ts
├── schemas/
│   ├── auth.schema.ts
│   └── property.schema.ts
├── stores/
│   ├── auth.store.ts
│   └── compare.store.ts
└── types/
    └── index.ts
```

Nguyen tac lam frontend:

- `app/`: route, layout, page, server actions.
- `components/`: component tai su dung.
- `components/ui/`: button, input, modal, badge, table.
- `components/properties/`: card BDS, filter, compare panel.
- `components/map/`: Leaflet map va marker.
- `components/chat/`: UI chat realtime.
- `lib/`: API client, socket client, helper.
- `schemas/`: Zod schema dung voi React Hook Form.
- `stores/`: Zustand global state.
- `types/`: TypeScript type dung chung.

## 7. Luong chay du kien cua he thong

### Dang ky/dang nhap

1. User nhap form tren frontend.
2. React Hook Form + Zod validate.
3. Frontend goi `/api/auth/register` hoac `/api/auth/login`.
4. Backend validate bang Zod.
5. Service hash/check password bang bcrypt.
6. Backend tra access token/refresh token.
7. Frontend luu auth state trong Zustand/cookie tuy cach trien khai.

### Dang bai bat dong san

1. User vao form dang bai.
2. Nhap thong tin: tieu de, gia, dien tich, dia chi, toa do, loai BDS.
3. Upload anh qua backend.
4. Backend dua anh len Cloudinary.
5. Backend luu `Property` va `PropertyImage` vao PostgreSQL.
6. Frontend dieu huong sang trang chi tiet tin.

### Tim kiem va loc BDS

1. User chon bo loc: khu vuc, khoang gia, dien tich, loai BDS.
2. Frontend tao query string.
3. Backend nhan query va tao Prisma filter.
4. Backend tra danh sach JSON.
5. Frontend render danh sach va marker tren ban do.

### Chat tu van realtime

1. User mo trang chi tiet BDS va bam chat.
2. Frontend ket noi Socket.io.
3. Backend join room theo `conversationId`.
4. Tin nhan duoc luu DB va emit realtime.
5. Hai ben thay tin nhan ngay lap tuc.

## 8. Checklist lien ket voi yeu cau do an

- NextJS App Router: nam trong `frontend/app/`.
- Tailwind CSS: `frontend/app/globals.css` va `postcss.config.mjs`.
- NodeJS/ExpressJS API: `backend/src/app.ts`, `backend/src/server.ts`.
- MVC/Router-Controller: can mo rong them `routes/`, `controllers/`, `services/`.
- Database & ORM: `backend/prisma/schema.prisma`, Prisma Client.
- Auth JWT + role: can trien khai trong `auth.controller/service/middleware`.
- Form & validation: frontend dung `react-hook-form` + `zod`, backend dung `zod`.
- Realtime: `socket.io` backend va `socket.io-client` frontend.
- File upload: `multer` + `cloudinary`.
- Map integration: `leaflet` + `react-leaflet`.
- Deployment: frontend Vercel, backend Render/Railway, database Supabase/PostgreSQL.

## 9. Cach chay local

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run dev
```

Backend mac dinh nen chay o:

```text
http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Frontend mac dinh chay o:

```text
http://localhost:3000
```

## 10. Nguyen tac commit va phat trien

Nen chia branch theo feature:

```text
feature/auth
feature/property-crud
feature/property-search
feature/realtime-chat
feature/map-integration
feature/upload-images
```

Commit message nen theo semantic commit:

```text
feat: add property listing schema
feat: implement JWT login API
fix: handle invalid property filter
docs: add project setup guide
```

Muc tieu: dap ung yeu cau GitHub workflow, commit history ro rang va de bao ve khi giang vien hoi phan cong cong viec.
