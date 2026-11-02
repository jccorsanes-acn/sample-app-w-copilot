import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

type ActivityInput = {
  userId: string;
  teamId: string;
  type: 'run' | 'cycle' | 'strength' | 'walk';
  minutes: number;
};

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseActivityInput(input: unknown): ActivityInput {
  if (!isRecord(input)) throw badRequest('Activity must be an object');
  const { userId, teamId, type, minutes } = input;
  if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) {
    throw badRequest('A valid userId is required');
  }
  if (typeof teamId !== 'string' || !mongoose.isValidObjectId(teamId)) {
    throw badRequest('A valid teamId is required');
  }
  if (type !== 'run' && type !== 'cycle' && type !== 'strength' && type !== 'walk') {
    throw badRequest('A supported activity type is required');
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw badRequest('Minutes must be a positive number');
  }
  return { userId, teamId, type, minutes };
}

export async function createActivity(input: unknown) {
  const parsed = parseActivityInput(input);
  const [user, team] = await Promise.all([
    User.findById(parsed.userId).select('_id').lean(),
    Team.findById(parsed.teamId).select('_id').lean(),
  ]);
  if (!user || !team) throw badRequest('The selected user and team must exist');

  return Activity.create({
    user: user._id,
    team: team._id,
    type: parsed.type,
    minutes: parsed.minutes,
    points: parsed.minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) throw badRequest('Team must be an object');
  const { name, mascot } = input;
  if (typeof name !== 'string' || !name.trim()) throw badRequest('A team name is required');
  if (typeof mascot !== 'string' || !mascot.trim()) throw badRequest('A team mascot is required');

  const rawMembers = input.members ?? [];
  if (!Array.isArray(rawMembers)) {
    throw badRequest('Members must be valid user IDs');
  }
  const memberIds: string[] = [];
  for (const member of rawMembers) {
    if (typeof member !== 'string' || !mongoose.isValidObjectId(member)) {
      throw badRequest('Members must be valid user IDs');
    }
    memberIds.push(member);
  }
  const members = [...new Set(memberIds)];
  const users = members.length ? await User.find({ _id: { $in: members } }).select('_id').lean() : [];
  if (users.length !== members.length) throw badRequest('Every team member must exist');

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: users.map(({ _id }) => _id) });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.toLowerCase() }).select('_id fitnessGoal').lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const [workouts, recentActivity] = await Promise.all([
    Workout.find().lean(),
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).select('type').lean(),
  ]);
  const activityFocus = recentActivity
    ? recentActivity.type === 'run' || recentActivity.type === 'cycle'
      ? 'endurance'
      : recentActivity.type === 'strength'
        ? 'strength'
        : 'mobility'
    : undefined;
  const focus = workouts.some(({ focus: workoutFocus }) => workoutFocus === user.fitnessGoal)
    ? user.fitnessGoal
    : activityFocus ?? user.fitnessGoal;
  return workouts
    .map((workout) => ({
      ...workout,
      reason: workout.focus === focus
        ? `Recommended to support your ${focus} ${focus === user.fitnessGoal ? 'goal' : 'activity pattern'}.`
        : `A complementary ${workout.focus} workout.`,
    }))
    .sort((a, b) => Number(b.focus === focus) - Number(a.focus === focus) || a.title.localeCompare(b.title));
}

export { User };
