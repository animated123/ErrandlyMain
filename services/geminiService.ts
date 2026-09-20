export const geminiService = {
  estimateErrandCost: async (description: string, location: string, urgency: string, category: string, extraData: any) => {
    try {
      const response = await fetch("/api/gemini/estimate-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, location, urgency, category, extraData }),
      });
      if (!response.ok) throw new Error("Backend cost estimation request failed");
      return await response.json();
    } catch (e) {
      console.error('AI Estimation failed', e);
      return { breakdown: { baseFee: 500, workScale: 1, total: 500 }, scale: 1 };
    }
  },

  parseErrandDescription: async (text: string) => {
    try {
      const response = await fetch("/api/gemini/parse-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Backend parsed description request failed");
      return await response.json();
    } catch (e) {
      return { title: text.substring(0, 30), category: 'General', location: '' };
    }
  },

  extractReceiptTotal: async (base64: string) => {
    try {
      const response = await fetch("/api/gemini/extract-receipt-total", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });
      if (!response.ok) throw new Error("Backend extract receipt request failed");
      return await response.json();
    } catch (e) {
      return { total: 0 };
    }
  }
};
