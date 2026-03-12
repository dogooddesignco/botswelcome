import { db } from '../config/database';

export class CommunityService {
  async create(
    creatorId: string,
    name: string,
    displayName: string,
    description?: string,
    settings?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Check for name uniqueness
    const existing = await db('communities').where({ name }).first();
    if (existing) {
      throw Object.assign(new Error('Community name already taken'), { statusCode: 409, code: 'CONFLICT' });
    }

    const defaultSettings = {
      allow_bots: true,
      require_self_eval: false,
      min_verification_tier: 1,
      ...settings,
    };

    const [community] = await db('communities')
      .insert({
        name,
        display_name: displayName,
        description: description ?? null,
        creator_id: creatorId,
        is_archived: false,
        settings: JSON.stringify(defaultSettings),
      })
      .returning('*');

    // Auto-join the creator as admin
    await db('community_members').insert({
      community_id: community.id,
      user_id: creatorId,
      role: 'admin',
    });

    return community;
  }

  async getByName(name: string): Promise<Record<string, unknown> | undefined> {
    const community = await db('communities').where({ name }).first();
    if (!community) return undefined;

    // Get member count
    const [{ count }] = await db('community_members')
      .where({ community_id: community.id })
      .count();

    return { ...community, member_count: Number(count) };
  }

  async list(
    page: number = 1,
    limit: number = 25,
    search?: string
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    const offset = (page - 1) * limit;

    let baseQuery = db('communities').where('is_archived', false);
    if (search) {
      baseQuery = baseQuery.andWhere(function () {
        this.where('name', 'ilike', `%${search}%`)
          .orWhere('display_name', 'ilike', `%${search}%`)
          .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const [{ count }] = await baseQuery.clone().count();
    const total = Number(count);

    const communities = await baseQuery
      .clone()
      .select('communities.*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Attach member counts
    if (communities.length > 0) {
      const ids = communities.map((c: Record<string, unknown>) => c.id as string);
      const memberCounts = await db('community_members')
        .select('community_id')
        .count('* as member_count')
        .whereIn('community_id', ids)
        .groupBy('community_id');

      const countMap = new Map(
        memberCounts.map((mc: Record<string, unknown>) => [mc.community_id, Number(mc.member_count)])
      );

      for (const community of communities) {
        community.member_count = countMap.get(community.id) || 0;
      }
    }

    const totalPages = Math.ceil(total / limit);
    return {
      data: communities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async update(
    name: string,
    userId: string,
    updates: {
      display_name?: string;
      description?: string;
      sidebar_md?: string;
      icon_url?: string;
      banner_url?: string;
      settings?: Record<string, unknown>;
      is_archived?: boolean;
    }
  ): Promise<Record<string, unknown> | undefined> {
    const community = await db('communities').where({ name }).first();
    if (!community) return undefined;

    // Check if user is creator or admin
    const isCreator = community.creator_id === userId;
    const membership = await db('community_members')
      .where({ community_id: community.id, user_id: userId })
      .first();
    const isAdmin = membership?.role === 'admin';

    if (!isCreator && !isAdmin) return undefined;

    const updateData: Record<string, unknown> = { updated_at: db.fn.now() };
    if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.sidebar_md !== undefined) updateData.sidebar_md = updates.sidebar_md;
    if (updates.icon_url !== undefined) updateData.icon_url = updates.icon_url;
    if (updates.banner_url !== undefined) updateData.banner_url = updates.banner_url;
    if (updates.is_archived !== undefined) updateData.is_archived = updates.is_archived;
    if (updates.settings !== undefined) {
      const currentSettings = typeof community.settings === 'string'
        ? JSON.parse(community.settings)
        : community.settings;
      updateData.settings = JSON.stringify({ ...currentSettings, ...updates.settings });
    }

    const [updated] = await db('communities')
      .where({ id: community.id })
      .update(updateData)
      .returning('*');

    return updated;
  }

  async join(communityName: string, userId: string): Promise<boolean> {
    const community = await db('communities').where({ name: communityName }).first();
    if (!community) {
      throw Object.assign(new Error('Community not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const existing = await db('community_members')
      .where({ community_id: community.id, user_id: userId })
      .first();

    if (existing) {
      throw Object.assign(new Error('Already a member'), { statusCode: 409, code: 'CONFLICT' });
    }

    await db('community_members').insert({
      community_id: community.id,
      user_id: userId,
      role: 'member',
    });

    return true;
  }

  async leave(communityName: string, userId: string): Promise<boolean> {
    const community = await db('communities').where({ name: communityName }).first();
    if (!community) {
      throw Object.assign(new Error('Community not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    if (community.creator_id === userId) {
      throw Object.assign(new Error('Creator cannot leave the community'), { statusCode: 400, code: 'BAD_REQUEST' });
    }

    const deleted = await db('community_members')
      .where({ community_id: community.id, user_id: userId })
      .delete();

    if (deleted === 0) {
      throw Object.assign(new Error('Not a member'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    return true;
  }

  async getMembers(
    communityName: string,
    page: number = 1,
    limit: number = 25
  ): Promise<{ data: Record<string, unknown>[]; pagination: Record<string, unknown> }> {
    const community = await db('communities').where({ name: communityName }).first();
    if (!community) {
      throw Object.assign(new Error('Community not found'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const offset = (page - 1) * limit;

    const [{ count }] = await db('community_members')
      .where({ community_id: community.id })
      .count();
    const total = Number(count);

    const members = await db('community_members')
      .select(
        'community_members.role',
        'community_members.joined_at',
        'users.id',
        'users.username',
        'users.display_name',
        'users.avatar_url',
        'users.is_bot',
        'users.verification_tier'
      )
      .join('users', 'users.id', 'community_members.user_id')
      .where('community_members.community_id', community.id)
      .orderBy('community_members.joined_at', 'asc')
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);
    return {
      data: members,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getMembership(communityId: string, userId: string): Promise<Record<string, unknown> | undefined> {
    return db('community_members')
      .where({ community_id: communityId, user_id: userId })
      .first();
  }
}

export const communityService = new CommunityService();
