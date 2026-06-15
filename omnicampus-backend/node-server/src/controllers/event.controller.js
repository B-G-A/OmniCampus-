const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const toEvent = (row) => ({
  _id: row.event_id,
  id: row.event_id,
  title: row.title,
  description: row.description,
  desc: row.description,
  venue: row.venue,
  date: row.date,
  organizer: 'OmniCampus',
  createdAt: row.created_at,
});

const listEvents = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('events').select('*').order('date', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: (data || []).map(toEvent) });
  } catch (error) {
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const { title, description, venue, date } = req.body;
    if (!title || !date) {
      throw new AppError('title and date are required.', 400, 'VALIDATION_ERROR');
    }
    const client = db();
    const { data, error } = await client.from('events').insert({
      title,
      description: description || null,
      venue: venue || null,
      date
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: toEvent(data) });
  } catch (error) {
    next(error);
  }
};

const registerForEvent = async (req, res, next) => {
  try {
    const client = db();
    const { data: student } = await client.from('students').select('student_id').eq('user_id', req.user.id).maybeSingle();
    if (!student) throw new AppError('Student profile not found', 404, 'NOT_FOUND');

    const { error } = await client.from('event_registrations').insert({
      event_id: req.params.id,
      student_id: student.student_id
    });
    
    // Ignore duplicate key errors if already registered
    if (error && error.code !== '23505') throw error;
    
    res.json({ success: true, message: 'Successfully registered for event' });
  } catch (error) {
    next(error);
  }
};

const unregisterFromEvent = async (req, res, next) => {
  try {
    const client = db();
    const { data: student } = await client.from('students').select('student_id').eq('user_id', req.user.id).maybeSingle();
    if (!student) throw new AppError('Student profile not found', 404, 'NOT_FOUND');

    const { error } = await client.from('event_registrations').delete()
      .eq('event_id', req.params.id)
      .eq('student_id', student.student_id);

    if (error) throw error;
    res.json({ success: true, message: 'Successfully unregistered from event' });
  } catch (error) {
    next(error);
  }
};

const getEventRegistrations = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('event_registrations')
      .select('registration_id, registered_at, students(student_id, roll_number, users(name, email))')
      .eq('event_id', req.params.id);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listEvents,
  createEvent,
  registerForEvent,
  unregisterFromEvent,
  getEventRegistrations
};
