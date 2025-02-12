import { json } from '@remix-run/node';

export async function loader({ request }) {
  // Beispiel-Daten – hier fügst du später deine Logik ein
  const settings = {
    hide_on_desktop: false,
    hide_on_mobile: false,
    page_slug: 'none',
    bot_background_colour: '#FFFFFF',
    bot_text_colour: '#1A1E23',
    user_background_colour: '#FECF02',
    user_text_colour: '#FFFAE5',
    chat_heading: 'KI-Beratung',
    send_label: 'Abschicken',
    type_here_label: 'Tippe hier dein Anliegen ein ...',
    outer_radius: 0,
    chat_bubble_radius: 0,
    input_button_radius: 0,
  };

  return json({ success: true, settings });
}
