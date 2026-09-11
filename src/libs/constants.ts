import { BotCommand } from "node-telegram-bot-api";

export enum MESSAGES {
  START_MAILING = "Ты успешно начал рассылку😎",
  STOP_MAILING = "Ты прекратил рассылку халявы😥\nКак только передумаешь ты знаешь, где меня найти😉",
  UNKNOWN_MEASSAGE = "Это незнакомая мне команда😕, попробуй другие🙂",
  NO_NEW_POSTS = "Сегодня не было обнаружено новой халявы, но все ещё впереди😎",
  POST_DB = "А пока держи халяву на сегодня😉",
  NO_POST_DB = "В моей базе данных нет постов, пока халяву не дам😥"
}

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
    "Всё просто как два пальца об асфальт😎"
  );
}

export function getBotCommands(): BotCommand[] {
  return [
    {
      command: "start",
      description: "Приветствие и список команд",
    },
    {
      command: "startxalyava",
      description: "Начать рассылку",
    },
    {
      command: "stopxalyava",
      description: "Остановить рассылку",
    },
  ];
}
