// app/routes/daily-data.js
export async function loader() {
    const today = new Date();
    let dailyInteractions = [];
    let dailyRevenue = [];
  
    for (let i = 6; i >= 0; i--) {
      let date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split("T")[0];
  
      dailyInteractions.push({ date: dateString, count: Math.floor(Math.random() * 100) + 50 });
      dailyRevenue.push({ date: dateString, revenue: Math.floor(Math.random() * 1000) + 200 });
    }
  
    return new Response(
      JSON.stringify({ dailyInteractions, dailyRevenue }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  