// GET-Endpunkt zum Aggregieren der Tracking-Daten
app.get('/daily-data', async (req, res) => {
    try {
      const today = new Date();
      // Starte vor 6 Tagen (damit insgesamt 7 Tage abgedeckt werden)
      const startDate = new Date();
      startDate.setDate(today.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
  
      const results = await Tracking.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: today },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            dailyRevenue: { $sum: '$total' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
  
      // Formatiere die Ergebnisse für dein Dashboard
      const dailyInteractions = results.map(item => ({
        date: item._id,
        count: item.count,
      }));
      const dailyRevenue = results.map(item => ({
        date: item._id,
        revenue: item.dailyRevenue,
      }));
  
      res.json({ dailyInteractions, dailyRevenue });
    } catch (error) {
      console.error('Error aggregating daily data:', error);
      res.status(500).json({ message: 'Unexpected Server Error' });
    }
  });
  