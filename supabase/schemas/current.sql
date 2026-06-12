


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entry_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friend_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "friend_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "no_self_friend_request" CHECK (("requester_id" <> "receiver_id"))
);


ALTER TABLE "public"."friend_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friendships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_low_id" "uuid" NOT NULL,
    "user_high_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "no_self_friendship" CHECK (("user_low_id" <> "user_high_id")),
    CONSTRAINT "ordered_friendship_ids" CHECK (("user_low_id" < "user_high_id"))
);


ALTER TABLE "public"."friendships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."journal_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "entry_date" "date" NOT NULL,
    "content" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "entry_timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    CONSTRAINT "journal_entries_entry_timezone_not_empty" CHECK (("length"(TRIM(BOTH FROM "entry_timezone")) > 0))
);


ALTER TABLE "public"."journal_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "preferred_timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_display_name_length_check" CHECK ((char_length("display_name") BETWEEN 1 AND 50)),
    CONSTRAINT "profiles_preferred_timezone_not_empty_check" CHECK ((char_length(TRIM(BOTH FROM "preferred_timezone")) > 0)),
    CONSTRAINT "profiles_username_format_check" CHECK (("username" ~ '^[a-z0-9_]{3,20}$'::"text"))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "unique_daily_entry_per_group" UNIQUE ("group_id", "author_id", "entry_date");



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "unique_friendship" UNIQUE ("user_low_id", "user_high_id");



CREATE INDEX "comments_author_id_idx" ON "public"."comments" USING "btree" ("author_id");



CREATE INDEX "comments_entry_id_created_at_idx" ON "public"."comments" USING "btree" ("entry_id", "created_at");



CREATE INDEX "comments_parent_comment_id_idx" ON "public"."comments" USING "btree" ("parent_comment_id");



CREATE INDEX "friend_requests_receiver_status_idx" ON "public"."friend_requests" USING "btree" ("receiver_id", "status");



CREATE INDEX "friend_requests_requester_status_idx" ON "public"."friend_requests" USING "btree" ("requester_id", "status");



CREATE INDEX "friendships_user_high_id_idx" ON "public"."friendships" USING "btree" ("user_high_id");



CREATE INDEX "friendships_user_low_id_idx" ON "public"."friendships" USING "btree" ("user_low_id");



CREATE INDEX "journal_entries_author_date_idx" ON "public"."journal_entries" USING "btree" ("author_id", "entry_date" DESC);



CREATE INDEX "journal_entries_group_date_idx" ON "public"."journal_entries" USING "btree" ("group_id", "entry_date" DESC);

CREATE UNIQUE INDEX "profiles_username_lower_key" ON "public"."profiles" USING "btree" (lower("username"));

CREATE INDEX "profiles_username_lookup_idx" ON "public"."profiles" USING "btree" ("username");



CREATE UNIQUE INDEX "unique_pending_friend_request" ON "public"."friend_requests" USING "btree" ("requester_id", "receiver_id") WHERE ("status" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "set_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_friend_requests_updated_at" BEFORE UPDATE ON "public"."friend_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_journal_entries_updated_at" BEFORE UPDATE ON "public"."journal_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_high_id_fkey" FOREIGN KEY ("user_high_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friendships"
    ADD CONSTRAINT "friendships_user_low_id_fkey" FOREIGN KEY ("user_low_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."journal_entries"
    ADD CONSTRAINT "journal_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can create comments on accessible entries" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "author_id") AND (EXISTS ( SELECT 1
   FROM "public"."journal_entries"
  WHERE (("journal_entries"."id" = "comments"."entry_id") AND ("journal_entries"."author_id" = "auth"."uid"()))))));

CREATE POLICY "Authors can delete comments on accessible entries" ON "public"."comments" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "author_id") AND (EXISTS ( SELECT 1
   FROM "public"."journal_entries"
  WHERE (("journal_entries"."id" = "comments"."entry_id") AND ("journal_entries"."author_id" = "auth"."uid"()))))));

CREATE POLICY "Authors can update comments on accessible entries" ON "public"."comments" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "author_id") AND (EXISTS ( SELECT 1
   FROM "public"."journal_entries"
  WHERE (("journal_entries"."id" = "comments"."entry_id") AND ("journal_entries"."author_id" = "auth"."uid"())))))) WITH CHECK ((("auth"."uid"() = "author_id") AND (EXISTS ( SELECT 1
   FROM "public"."journal_entries"
  WHERE (("journal_entries"."id" = "comments"."entry_id") AND ("journal_entries"."author_id" = "auth"."uid"()))))));

CREATE POLICY "Comment participants can read comments" ON "public"."comments" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "author_id") OR (EXISTS ( SELECT 1
   FROM "public"."journal_entries"
  WHERE (("journal_entries"."id" = "comments"."entry_id") AND ("journal_entries"."author_id" = "auth"."uid"()))))));

ALTER TABLE "public"."friend_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read friend requests" ON "public"."friend_requests" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "receiver_id")));

CREATE POLICY "Users can create friend requests" ON "public"."friend_requests" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "requester_id") AND ("requester_id" <> "receiver_id")));

ALTER TABLE "public"."friendships" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read friendships" ON "public"."friendships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_low_id") OR ("auth"."uid"() = "user_high_id")));

ALTER TABLE "public"."journal_entries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can create journal entries" ON "public"."journal_entries" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "author_id"));

CREATE POLICY "Authors can delete their journal entries" ON "public"."journal_entries" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "author_id"));

CREATE POLICY "Authors can read their journal entries" ON "public"."journal_entries" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "author_id"));

CREATE POLICY "Authors can update their journal entries" ON "public"."journal_entries" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])
ON CONFLICT ("id") DO UPDATE SET
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types";

CREATE POLICY "Users can read their avatar objects" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "Users can upload their avatar objects" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));

CREATE POLICY "Users can delete their avatar objects" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'avatars'::"text") AND (("storage"."foldername"("name"))[1] = ("auth"."uid"())::"text")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."friend_requests" TO "anon";
GRANT ALL ON TABLE "public"."friend_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."friend_requests" TO "service_role";



GRANT ALL ON TABLE "public"."friendships" TO "anon";
GRANT ALL ON TABLE "public"."friendships" TO "authenticated";
GRANT ALL ON TABLE "public"."friendships" TO "service_role";



GRANT ALL ON TABLE "public"."journal_entries" TO "anon";
GRANT ALL ON TABLE "public"."journal_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."journal_entries" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




