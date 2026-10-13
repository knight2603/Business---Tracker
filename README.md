# Balance 50/30/20

Aplicación local de finanzas personales con React y Laravel. Registra ingresos y distribuye el presupuesto mensual entre necesidades (50%), deseos (30%) y ahorro (20%). Los gastos nuevos se agregan como pendientes a un checklist; se descuentan del saldo al marcarlos como realizados y quedan en la vista de movimientos con fecha y hora. El tablero incluye avance del checklist, gráficos de distribución y presupuesto, tema oscuro y diseño adaptable.

## Iniciar

Backend (requiere PHP y Composer):

```powershell
cd backend/businessTracker
php artisan migrate
php artisan serve
```

Frontend (requiere Node.js):

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

El frontend usa `http://localhost:8000/api` por defecto. Cambia `VITE_API_URL` en `frontend/.env` si el backend usa otra dirección. `FRONTEND_URL` en el `.env` de Laravel permite configurar uno o varios orígenes separados por coma para CORS.

## API

- `GET /api/dashboard?month=YYYY-MM`: ingresos y presupuesto mensual, gastos agrupados por categoría y movimientos recientes.
- `POST /api/incomes`: recibe `amount`, `description` y `date` (`YYYY-MM-DD`).
- `POST /api/expenses`: recibe `amount`, `description`, `category` (`needs`, `wants` o `savings`) y `date` (`YYYY-MM-DD`).
- `POST /api/expenses/{expenseId}/complete`: marca un gasto pendiente, descuenta el monto una sola vez y guarda `completed_at`.
- `GET /api/movements`: historial completo de gastos marcados como realizados.
- `GET /api/statistics?months=12`: totales mensuales de ingresos, gastos completados y saldo disponible, con detalle por categoría. `months` puede ser de 3 a 12.
- `GET /api/goals`: metas personales, aportes, ingreso mensual y capacidad sugerida de ahorro (20%).
- `POST /api/goals`: crea una meta con `name`, `target_amount`, `term_unit` (`month` o `year`), `term_value` (hasta 120 meses o 10 años) y una foto opcional (`photo`, JPG/PNG/WebP, máximo 5 MB); calcula la cuota sugerida y fecha objetivo.
- `POST /api/goals/{goalId}/contributions`: recibe `amount` y suma un aporte a la meta. El aporte no puede superar lo que falta para completarla.
- `GET /api/accounts`: lista las cuentas del usuario, sus saldos, historial y saldo total.
- `POST /api/accounts`: crea una cuenta con `name`, `type` (`bank`, `credit`, `wallet` u `other`) y `initial_balance` opcional.
- `POST /api/accounts/{accountId}/deposits`: agrega `amount`, `description` y `date` opcionales al saldo e historial de la cuenta.

Las respuestas son JSON. Los montos deben ser mayores que cero; Laravel devuelve errores de validación con estado `422`.

## Cuentas y sesiones

- `POST /api/register`: recibe `name`, `email` (debe pertenecer al dominio `gmail.com`), `password` y `password_confirmation`; crea la cuenta e inicia sesión.
- `POST /api/login`: recibe `email` y `password`.
- `GET /api/me`: devuelve el usuario de la sesión actual.
- `POST /api/logout`: revoca el token actual.
- `POST /api/profile`: actualiza `email` y admite `profile_photo` (JPG/PNG/WebP, máximo 5 MB); para cambiar contraseña recibe `current_password`, `password` y `password_confirmation`.
- `GET /api/savings`: devuelve las clasificaciones personales de ahorro, su historial y el total acumulado.
- `POST /api/savings/categories`: crea una clasificación con `name` y `color` (`green`, `blue`, `violet` u `orange`).
- `POST /api/savings/categories/{categoryId}/transactions`: recibe `type` (`deposit` o `withdrawal`), `amount`, `date` y una `description` opcional. Los retiros no pueden superar el saldo disponible.
- `GET /api/debts`: lista deudas, fechas de cobro y total activo.
- `POST /api/debts`: recibe `name`, `amount` y `due_date`; la fecha puede ser pasada o futura.
- `POST /api/debts/{debtId}/pay`: marca la deuda pagada y registra el pago como gasto realizado en Necesidades (50%), con trazabilidad en Movimientos.

Las rutas de balance, metas, ingresos y gastos requieren `Authorization: Bearer <token>`. El token aleatorio vence en 30 días y solo se almacena su hash en la base de datos. El frontend conserva el token en el navegador, muestra el nombre de la cuenta activa y permite cerrar sesión. Cada movimiento y meta queda asociado a su dueño, así que las cuentas solo pueden consultar sus propios datos. Las fotos de metas se guardan en el disco público de Laravel; ejecuta `php artisan storage:link` una vez por instalación.

Los movimientos creados antes de activar el login conservan `user_id` vacío y no se muestran a cuentas nuevas. La base de datos usa la conexión definida en el `.env` de Laravel.
