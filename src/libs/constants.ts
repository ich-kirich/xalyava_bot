import { BotCommand } from "node-telegram-bot-api";
import { getSleepDelayHint } from "./sleepWindow";

export enum MESSAGES {
  START_MAILING = "Ты успешно начал рассылку😎",
  STOP_MAILING = "Ты прекратил рассылку халявы😥\nКак только передумаешь ты знаешь, где меня найти😉",
  UNKNOWN_MEASSAGE = "Это незнакомая мне команда😕, попробуй другие🙂",
  NO_NEW_POSTS = "Сегодня не было обнаружено новой халявы, но все ещё впереди😎",
  POST_DB = "А пока держи халяву на сегодня😉",
  NO_POST_DB = "В моей базе данных нет постов, пока халяву не дам😥"
}

export const TELEGRAM_MESSAGE_LIMIT = 4096;
export const POSTS_LIMIT = 10;
export const FETCH_ATTEMPTS = 3;
export const FETCH_RETRY_DELAY_MS = 2000;

export const linkSite = "https://pikabu.ru/community/steam";

export function getHelloMessage(): string {
  return (
    "Добро пожаловать в 'Халява Бот'! \n" +
    "Я делаю рассылку постов с раздачей всякий преколямб с этого сайта:\n" +
    `${linkSite}\n` +
    "Как только там появился пост - я отправляю его тебе😘\n" +
    "Вот команды, которые тебе пригодятся:\n" +
    "/startxalyava - начать рассылку постов\n" +
    "/stopxalyava - прекратить рассылку постов\n" +
    `${getSleepDelayHint()}\n` +
    "Всё просто как два пальца об асфальт😎"
  );
}

export function getBotDescription(): string {
  return (
    "Рассылка халявы с Pikabu Steam. " +
    `${getSleepDelayHint()}.`
  );
}

export function getBotShortDescription(): string {
  return getSleepDelayHint();
}

export function getBotCommands(): BotCommand[] {
  const hint = getSleepDelayHint();
  return [
    {
      command: "startxalyava",
      description: `Начать рассылку. ${hint}`,
    },
    {
      command: "stopxalyava",
      description: `Остановить рассылку. ${hint}`,
    },
  ];
}
