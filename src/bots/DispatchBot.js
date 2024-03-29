const { ActivityHandler, CardFactory, MessageFactory } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');

class DispatchBot extends ActivityHandler {
  constructor() {
    super();

    // Criação da Instancia do LuisDispatcher
    const dispatchRecognizer = new LuisRecognizer(
      {
        applicationId: process.env.LuisAppId,
        endpointKey: process.env.LuisAPIKey,
        endpoint: `https://${process.env.LuisAPIHostName}.api.cognitive.microsoft.com`,
      },
      {
        includeAllIntents: true,
        includeInstanceData: true,
      },
      true,
    );

    // Criação da instância do QnA
    const qnaMaker = new QnAMaker({
      knowledgeBaseId: process.env.QnAKnowledgebaseId,
      endpointKey: process.env.QnAEndpointKey,
      host: process.env.QnAEndpointHostName,
    });

    this.dispatchRecognizer = dispatchRecognizer;
    this.qnaMaker = qnaMaker;

    this.onMessage(async (context, next) => {
      console.log('Processando mensagem...');

      // Primeiro usa-se o modelo Dispatch para decidir para qual serviço cognitivo encaminhar
      const recognizerResult = await dispatchRecognizer.recognize(context);

      // Intencao com maior pontuacao determina qual serviço será usado
      const intent = LuisRecognizer.topIntent(recognizerResult);

      // o dispatch então é chamado com a intenção de maior pontuação
      await this.dispatchToTopIntentAsync(context, intent, recognizerResult);

      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const { membersAdded } = context.activity;

      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(`Bem-vindo, ${member.name}!`);
        }
      }

      await next();
    });
  }

  async dispatchToTopIntentAsync(context, intent, recognizerResult) {
    switch (intent) {
      case 'l_saudar':
        await this.processGreeting(context, recognizerResult.luisResult);
        break;
      case 'q_qna-intent':
        await this.processQnAIntent(context);
        break;
      // caso a intenção detectada seja "None"
      default:
        console.log(`Intenção não reconhecida pelo LUIS: ${intent}.`);
        await context.sendActivity(
          `Desculpe, ainda não aprendi sobre esse assunto... (${intent}).`,
        );
        break;
    }
  }

  // função que cumprimenta um usuário
  async processGreeting(context, luisResult) {
    console.log('processGreeting');

    // Retrieve LUIS result for Process Automation.
    const result = luisResult.connectedServiceResult;
    const { intent } = result.topScoringIntent;

    await context.sendActivity(`Intent com maior pontuação: ${intent}.`);
    await context.sendActivity(
      'Olá! Eu sou um bot que responde perguntas relacionadas à LGPD - Lei Geral de Proteção de Dados. Sobre o que gostaria de saber? Me pergunte sobre algo!',
    );
    // await context.sendActivity(`HomeAutomation intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

    // if (luisResult.entities.length > 0) {
    //     await context.sendActivity(`HomeAutomation entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
    // }
  }

  // função que faz a busca na base de conhecimento do QnA
  // Se houver contexto de acompanhamento, os exibe em forma de card
  async processQnAIntent(turnContext) {
    const { value } = turnContext.activity;
    const qnaId = value && value.qnaId;
    // qnaId será undefined se o valor estiver vazio
    const results = await this.qnaMaker.getAnswers(turnContext, { qnaId });
    const firstResult = results[0];

    if (firstResult) {
      let { answer } = firstResult;
      const resultContext = firstResult.context;
      const prompts = resultContext && resultContext.prompts;

      if (prompts && prompts.length) {
        const card = CardFactory.heroCard(
          answer,
          [],
          prompts.map((prompt) => ({
            type: 'messageBack',
            title: prompt.displayText,
            displayText: prompt.displayText,
            text: prompt.displayText,
            value: { qnaId: prompt.qnaId },
          })),
        );

        answer = MessageFactory.attachment(card);
      }

      await turnContext.sendActivity(answer);
    } else {
      await turnContext.sendActivity(
        'Desculpe, ainda não sei sobre esse assunto.\nVou estudar mais!',
      );
    }
  }
}

module.exports.DispatchBot = DispatchBot;
