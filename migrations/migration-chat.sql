-- Миграция чата для продакшн-сервера
-- Выполните этот скрипт на вашей БД

-- 1. Таблица chat_conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE CASCADE,
  assignee_id varchar REFERENCES users(id),
  status varchar(20) NOT NULL DEFAULT 'open',
  priority varchar(20) NOT NULL DEFAULT 'normal',
  subject text,
  last_message text,
  last_message_at timestamp DEFAULT now(),
  unread_admin integer NOT NULL DEFAULT 0,
  unread_user integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT ARRAY[]::text[],
  note text,
  guest_name varchar(100),
  guest_token varchar(64),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Индексы для chat_conversations
CREATE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_assignee ON chat_conversations(assignee_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conv_guest ON chat_conversations(guest_token);

-- 2. Таблица chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id varchar NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id varchar REFERENCES users(id) ON DELETE CASCADE,
  role varchar(10) NOT NULL,
  text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  reactions jsonb DEFAULT '[]'::jsonb,
  file_url text,
  file_name text,
  file_type varchar(100),
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_sender ON chat_messages(sender_id);

-- 3. Таблица chat_settings
CREATE TABLE IF NOT EXISTS chat_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  greeting text NOT NULL DEFAULT 'Добрый день! Чем могу помочь?',
  away_message text NOT NULL DEFAULT 'Мы сейчас не в сети. Ответим в ближайшее время.',
  auto_assign boolean NOT NULL DEFAULT true,
  working_hours boolean NOT NULL DEFAULT true,
  bot_enabled boolean NOT NULL DEFAULT false,
  telegram_bot_token text,
  telegram_chat_id text,
  telegram_enabled boolean NOT NULL DEFAULT false,
  telegram_notify_new_conversation boolean NOT NULL DEFAULT true,
  telegram_notify_new_message boolean NOT NULL DEFAULT true,
  telegram_notify_purchase boolean NOT NULL DEFAULT true,
  telegram_notify_topup boolean NOT NULL DEFAULT true,
  telegram_notify_review boolean NOT NULL DEFAULT true,
  telegram_notify_course_request boolean NOT NULL DEFAULT true,
  updated_at timestamp DEFAULT now()
);

-- 4. Добавить недостающие колонки (если таблицы уже существуют, но без новых колонок)

-- chat_conversations: guest columns
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS guest_name varchar(100);
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS guest_token varchar(64);
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS unread_admin integer NOT NULL DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS unread_user integer NOT NULL DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS last_message text;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS last_message_at timestamp DEFAULT now();

-- chat_messages: file columns
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_type varchar(100);

-- chat_settings: telegram columns
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_bot_token text;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_chat_id text;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_notify_new_conversation boolean NOT NULL DEFAULT true;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_notify_new_message boolean NOT NULL DEFAULT true;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_notify_purchase boolean NOT NULL DEFAULT true;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_notify_topup boolean NOT NULL DEFAULT true;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_notify_review boolean NOT NULL DEFAULT true;
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS telegram_notify_course_request boolean NOT NULL DEFAULT true;

-- 5. Создать начальную запись настроек если пусто
INSERT INTO chat_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM chat_settings LIMIT 1);

-- 6. Добавить колонку skip_2fa_on_login в site_settings
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS skip_2fa_on_login boolean NOT NULL DEFAULT false;

-- Готово!
SELECT 'Migration complete' as status;
