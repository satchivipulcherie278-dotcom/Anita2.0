import { GoogleGenAI, Chat, Content } from "@google/genai";
import { ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
Tu es Anita, une assistante personnelle virtuelle extrêmement compétente, sérieuse et professionnelle.
Tu t'adresses toujours à l'utilisateur en l'appelant "Boss".

TON RÔLE PRINCIPAL :
1. Accompagner le Boss dans la rédaction, la planification et l'exécution de ses projets.
2. Aider activement à découper les grands objectifs en petites tâches réalisables.
3. Suggérer régulièrement des actions concrètes à ajouter à la "Task List" de l'application.
4. Utiliser tes outils de recherche (Google Search) dès qu'une information factuelle, d'actualité ou précise est demandée (prix, concurrents, nouvelles, dates).

STYLE :
- Proactive, structurée et concise.
- Ne sors jamais de ton personnage. Tu es une femme.
- Si on parle d'un projet flou, propose immédiatement un plan d'action en 3 à 5 points.
- Si tu utilises des informations venant de Google Search, cite tes sources à la fin si nécessaire.

Si on te demande de générer une image, indique que tu vas passer en mode création visuelle.
`;

let chatSession: Chat | null = null;

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Fonction utilitaire pour convertir l'historique local en format Gemini
const formatHistoryForGemini = (messages: ChatMessage[]): Content[] => {
  return messages
    .filter(msg => !msg.isError) // On ignore les messages d'erreur
    .map(msg => {
      const parts: any[] = [];
      
      // Gestion des images dans l'historique
      if (msg.imageUrl) {
        try {
          // Format attendu: data:image/png;base64,.....
          const [metadata, base64Data] = msg.imageUrl.split(',');
          const mimeType = metadata.match(/:(.*?);/)?.[1];
          
          if (mimeType && base64Data) {
            parts.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            });
          }
        } catch (e) {
          console.warn("Impossible de restaurer l'image de l'historique", e);
        }
      }

      // Ajout du texte (obligatoire, même vide)
      parts.push({ text: msg.text || " " });

      return {
        role: msg.role,
        parts: parts
      };
    });
};

export const getChatSession = (previousHistory: ChatMessage[] = []) => {
  // Si une session existe déjà, on la retourne (le contexte est déjà dedans)
  if (chatSession) {
    return chatSession;
  }

  // Sinon, on crée une nouvelle session en injectant l'historique
  const ai = getAiClient();
  
  // Conversion de l'historique local vers le format SDK
  const geminiHistory = formatHistoryForGemini(previousHistory);

  chatSession = ai.chats.create({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      // ACTIVATION DE LA RECHERCHE GOOGLE (GROUNDING)
      tools: [{ googleSearch: {} }],
    },
    history: geminiHistory
  });

  return chatSession;
};

export const resetChatSession = () => {
  chatSession = null;
};

export const sendMessageStream = async (
  message: string,
  imageBase64?: string,
  mimeType: string = 'image/jpeg',
  previousHistory: ChatMessage[] = []
) => {
  // On passe l'historique existant pour initialiser la session si elle n'existe pas
  const chat = getChatSession(previousHistory);
  
  let msgContent: any = message;
  
  if (imageBase64) {
    msgContent = [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: message || "Analyse cette image pour moi, Anita." }
    ];
  }

  return chat.sendMessageStream({ message: msgContent });
};

export const generateImage = async (prompt: string) => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Aucune image n'a été générée. Veuillez reformuler.");
};

export const transcribeAudio = async (audioBase64: string, mimeType: string) => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: "Transcris l'audio suivant en texte, exactement tel qu'il est prononcé. Ne donne aucune explication, juste le texte." }
      ]
    }
  });
  return response.text;
};

// Fonction spéciale pour le module Secrétariat
export const generateMeetingReport = async (history: ChatMessage[]) => {
  const ai = getAiClient();
  
  // On crée un contexte spécifique avec l'historique
  const chatHistory = formatHistoryForGemini(history);
  
  // On utilise un modèle performant pour la synthèse
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      ...chatHistory,
      {
        role: 'user',
        parts: [{ text: `
          Agis en tant que Secrétaire de Direction Experte. 
          Rédige un "COMPTE-RENDU DE PROJET" basé sur notre conversation ci-dessus.
          
          Objectif : Créer un document clair, professionnel et structuré, prêt à être imprimé ou archivé.
          
          Format attendu (Texte brut, pas de markdown gras/italique compliqué car ce sera mis en PDF simple) :
          
          TITRE DU PROJET (Invente un titre pertinent si pas donné)
          DATE : ${new Date().toLocaleDateString()}
          ---------------------------------------------------
          
          1. OBJECTIFS DE LA SÉANCE
          [Résumé des objectifs]
          
          2. POINTS CLÉS ABORDÉS
          [Liste des points importants discutés]
          
          3. DÉCISIONS VALIDÉES
          [Liste des décisions prises]
          
          4. PLAN D'ACTION (TO-DO)
          [Liste des actions à entreprendre]
          
          5. NOTES DIVERSES
          [Autres informations pertinentes]
          
          Reste concis et professionnel. Ignore le "small talk".
        `}]
      }
    ]
  });

  return response.text;
};