-- Delete exact duplicate questions: 41 questions
-- Generated: 2026-02-19T13:39:35.340Z

BEGIN;

-- english: 1 duplicates
DELETE FROM questions WHERE id = '9524aa7f-1c9f-41e1-9036-379e21d03059'; -- [31] dupe of [94]

-- informatics: 5 duplicates
DELETE FROM questions WHERE id = 'aba6ba6e-1db7-49f5-853d-12e2e637504c'; -- [18] dupe of [17]
DELETE FROM questions WHERE id = '674ca5ed-82b3-4ec0-99fd-3a60eb81d2c5'; -- [97] dupe of [98]
DELETE FROM questions WHERE id = 'ffce00eb-6db1-40d8-a68b-bbd5b657116b'; -- [110] dupe of [111]
DELETE FROM questions WHERE id = 'c97b0b32-952c-47ba-8da3-e8f982f130ae'; -- [129] dupe of [128]
DELETE FROM questions WHERE id = '3b60888b-79e9-4ec1-8a38-4b532a13ea5f'; -- [131] dupe of [130]

-- law: 1 duplicates
DELETE FROM questions WHERE id = 'ca8b236a-7f46-4617-aae8-bcd56ff63bb2'; -- [56] dupe of [122]

-- math: 5 duplicates
DELETE FROM questions WHERE id = '60c4402e-e619-421c-ad56-92d96efc18ff'; -- [440] dupe of [158]
DELETE FROM questions WHERE id = 'e77d064f-7532-4f70-944d-e3a36f174ef9'; -- [463] dupe of [284]
DELETE FROM questions WHERE id = '5c07259a-d8ed-4abf-9848-bb75c5bcc3b1'; -- [465] dupe of [304]
DELETE FROM questions WHERE id = '5c4e8dad-a46d-4b5c-bb07-c439c1b6840e'; -- [383] dupe of [348]
DELETE FROM questions WHERE id = '58a6af0a-0d47-4b1d-b0e4-780797472ed8'; -- [365] dupe of [474]

-- math_profile: 1 duplicates
DELETE FROM questions WHERE id = 'e0e78af6-83da-4dbb-a7c4-a1278db133e8'; -- [56] dupe of [72]

-- physics: 13 duplicates
DELETE FROM questions WHERE id = '3cb87ce4-ea52-4cc0-a3ab-fe695618cff3'; -- [157] dupe of [242]
DELETE FROM questions WHERE id = 'd5181e90-b823-49d1-86b4-c2e269edb312'; -- [232] dupe of [183]
DELETE FROM questions WHERE id = '6d6c381d-a9d3-412f-b25b-09e9cec76b58'; -- [288] dupe of [195]
DELETE FROM questions WHERE id = '2d61f8b6-1092-4bef-8be2-35f331e92c8a'; -- [249] dupe of [297]
DELETE FROM questions WHERE id = '59b2d9bf-a214-4088-a15d-dc492b5b72f5'; -- [271] dupe of [362]
DELETE FROM questions WHERE id = '07d580c1-17dc-4f50-8fdc-b45b7469810a'; -- [317] dupe of [272]
DELETE FROM questions WHERE id = '89a8b3e1-0e85-4c9c-b2d8-c1f14cf10fbc'; -- [321] dupe of [275]
DELETE FROM questions WHERE id = 'b6cdb867-ca12-433f-b228-b53cf81c8e32'; -- [297] dupe of [341]
DELETE FROM questions WHERE id = '7f3112bb-bb0b-4eea-b12a-88d58e0f0353'; -- [354] dupe of [306]
DELETE FROM questions WHERE id = '6e6291bc-61c5-4f59-9cda-7c60bbdbc0fc'; -- [405] dupe of [454]
DELETE FROM questions WHERE id = '15ba5167-d678-4421-8da8-76d0c07fb5cf'; -- [454] dupe of [476]

-- reading: 39 duplicates
DELETE FROM questions WHERE id = 'e1952261-153a-41f0-9753-541201f8a5f4'; -- [155] dupe of [180]
DELETE FROM questions WHERE id = '36dfc29b-972a-4fe2-bdf5-87f608adebe2'; -- [321] dupe of [156]
DELETE FROM questions WHERE id = 'f95f2e53-b717-4a72-9412-578269bf1fa7'; -- [167] dupe of [293]
DELETE FROM questions WHERE id = '94a5a8fd-3d07-4585-aacc-a4abf73ca215'; -- [326] dupe of [173]
DELETE FROM questions WHERE id = '9c695d5c-2035-4ac6-b949-0d969e7bb0bd'; -- [180] dupe of [215]
DELETE FROM questions WHERE id = 'ddcd3b20-da93-4bb5-b123-013ff2eb45d1'; -- [185] dupe of [195]
DELETE FROM questions WHERE id = '30a1d065-ea4a-41c4-b7c7-90b93c1a77ed'; -- [190] dupe of [205]
DELETE FROM questions WHERE id = 'e8781aff-61d9-4909-9701-010d93196e28'; -- [195] dupe of [210]
DELETE FROM questions WHERE id = '5ce4dc4e-3aa9-45a1-864a-c57f92500848'; -- [205] dupe of [320]
DELETE FROM questions WHERE id = 'eb9de423-c64e-4e53-967c-4192300ca472'; -- [210] dupe of [240]
DELETE FROM questions WHERE id = 'c5d834cc-7681-48b9-85e9-577338db18e5'; -- [215] dupe of [230]
DELETE FROM questions WHERE id = '80fc6de7-148a-4b52-b230-bbdd54878b22'; -- [230] dupe of [250]
DELETE FROM questions WHERE id = 'b19f9252-c5a1-476a-8957-053b00696bac'; -- [240] dupe of [285]
DELETE FROM questions WHERE id = '8d10df05-a699-4269-94ff-c98155f4fc73'; -- [250] dupe of [280]
DELETE FROM questions WHERE id = 'c3b90720-a8e4-4711-9a8e-469c07a4b583'; -- [281] dupe of [251]
DELETE FROM questions WHERE id = '16055f7a-9e58-4a61-a6e1-c2e770aef899'; -- [280] dupe of [290]
DELETE FROM questions WHERE id = '64ede34a-9d79-42fb-89d4-6e612090d50b'; -- [392] dupe of [362]

COMMIT;