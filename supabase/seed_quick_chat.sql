-- Seed data for Quick Chat Messages with Categories

-- Text Messages
insert into public.quick_chat_messages (key, text, category) values
('HELLO', 'Hello!', 'text'),
('GOOD_GAME', 'Good Game!', 'text'),
('WELL_PLAYED', 'Well Played!', 'text'),
('THANKS', 'Thanks!', 'text'),
('OOPS', 'Oops!', 'text'),
('WOW', 'Wow!', 'text'),
('NICE', 'Nice!', 'text'),
('SORRY', 'Sorry!', 'text'),
('GOOD_LUCK', 'Good Luck!', 'text'),
('BYE', 'Bye!', 'text');

-- Emoticons
insert into public.quick_chat_messages (key, text, category) values
('EMOJI_SMILE', '🙂', 'emoticon'),
('EMOJI_LAUGH', '😂', 'emoticon'),
('EMOJI_COOL', '😎', 'emoticon'),
('EMOJI_LOVE', '😍', 'emoticon'),
('EMOJI_THUMBS_UP', '👍', 'emoticon'),
('EMOJI_CLAP', '👏', 'emoticon'),
('EMOJI_FIRE', '🔥', 'emoticon'),
('EMOJI_PARTY', '🎉', 'emoticon'),
('EMOJI_THINK', '🤔', 'emoticon'),
('EMOJI_CRY', '😭', 'emoticon');

-- Chat Filter Rules (Basic Examples)
insert into public.chat_filter_rules (pattern, action, replacement) values
('badword', 'replace', '****'),
('spam', 'block', null),
('offensive', 'flag', null);
