# trab-tra-portal — frozen

The TRA desk now lives inside the self-service portal, so TRA and appellants
use one system: **`../trab_selfservice`**.

- Officers sign in at `/welcome` with email and password ("Sign in with email
  and password" on the same card as the appellant phone code).
- The desk is served from `/tra/*`: dashboard, notices, appeals (with the
  appeal page and its panels), applications, hearings, decisions and officers.
- The code is at `src/views/tra/`, `src/components/tra/`, `src/utils/tra/` and
  `src/service/TraApi.js`.

Nothing here is deployed. It is kept only as the reference the merged desk was
ported from; make changes in `trab_selfservice`, not in this repository.

The backend is unchanged: the merged portal calls the same `/api/tra/*`
endpoints in `../trab_back_upgraded/src/tra`.
