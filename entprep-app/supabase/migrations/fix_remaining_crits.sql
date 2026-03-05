-- Fix 3 remaining English questions with duplicate options
-- biology[27] is a false positive (АА vs аа are different in genetics)

BEGIN;

-- english[20]: "изучает английский язык" appears twice → fix A to "studies English"
UPDATE questions SET
  o = '["studies English","изучает английский язык","has been studying","изучал английский язык"]'::jsonb,
  c = 2,
  e = 'He has been studying English for 5 years — Present Perfect Continuous, потому что действие началось в прошлом и продолжается до сих пор. Маркер: for 5 years. Studies — Present Simple (привычка), studied — Past Simple (завершено).'
WHERE id = 'ab1a162e-dd35-45ef-83f5-2ce49166f0cf';

-- english[69]: "will finish the project" appears twice → fix B to "are going to finish"
UPDATE questions SET
  o = '["will finish the project","are going to finish","will have finished","are finishing the project"]'::jsonb,
  c = 2,
  e = 'They will have finished the project by the end of this week — Future Perfect, потому что действие будет завершено к определённому моменту в будущем. Маркер: by the end of this week.'
WHERE id = 'd751af3f-7e77-45a6-9fe2-cd79cf86606c';

-- english[76]: "would have passed" appears twice → fix A to "would pass"
UPDATE questions SET
  o = '["would pass","would have passed","will have passed","had passed"]'::jsonb,
  c = 1,
  e = 'If she had studied harder, she would have passed the exam — Third Conditional (If + Past Perfect, would have + V3). Условие не выполнено в прошлом. Would pass — Second Conditional (неправильно для прошлого).'
WHERE id = '652d35db-2451-4f4a-a0ed-35a82f8246e0';

COMMIT;
