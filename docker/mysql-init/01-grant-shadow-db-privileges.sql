-- Runs automatically (as root) the first time the MySQL container
-- initializes an empty data directory — see docker-compose.yml, which
-- mounts this whole folder into /docker-entrypoint-initdb.d/.
--
-- Why this is needed: the official MySQL image's MYSQL_USER /
-- MYSQL_DATABASE env vars only grant the app user privileges on that one
-- database. `prisma migrate dev` needs to create and drop a separate
-- "shadow database" to detect schema drift, which requires
-- server-wide CREATE/DROP privileges the scoped user doesn't have by
-- default — that's the P3014 / P1010 error.
--
-- This container is a throwaway local dev instance with no real data
-- and isn't reachable from outside your machine, so a broad grant here
-- is fine. This has no bearing on production: Hostinger (or wherever
-- you deploy) manages its own MySQL user and privileges separately —
-- see the README's deployment notes.
GRANT ALL PRIVILEGES ON *.* TO 'civicsprep'@'%';
FLUSH PRIVILEGES;
