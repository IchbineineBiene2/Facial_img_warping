# Facial Image Warping Workspace

Bu depo artik iki ana bolume ayrildi:

- `frontend/`: Expo + React Native istemci uygulamasi
- `backend/`: Express + SQLite API servisi

## Klasor Yapisi

- `frontend/app/`: ekranlar ve route dosyalari
- `frontend/components/`: paylasilan UI bilesenleri
- `frontend/services/`: backend API istemcisi
- `backend/server.js`: API endpoint giris dosyasi
- `backend/db.js`: SQLite erisim ve tablo islemleri

## Kurulum

1. Frontend bagimliliklari:

```bash
npm --prefix frontend install
```

2. Backend bagimliliklari:

```bash
npm --prefix backend install
```

## Calistirma

- Frontend (Expo):

```bash
npm run frontend
```

- Frontend web:

```bash
npm run web
```

- Backend:

```bash
npm run backend
```

## Not

Backend varsayilan olarak `http://localhost:8000` adresinde calisir.
Frontend API cagirilari bu adrese gore ayarlanmistir.
