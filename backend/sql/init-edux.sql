-- Local Docker init only (docker-entrypoint-initdb.d). Safe no-op if edux already exists.
-- App connections still set search_path per session; this does not change other databases.
CREATE SCHEMA IF NOT EXISTS edux;
