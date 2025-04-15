import { Request, Response } from 'express';
import { OpenFGAService } from '../services/OpenFGAService';
import { AuthService } from '../services/AuthService';
import { logger } from '../utils/logger';
import { validateRequest } from '../utils/validation';
import { z } from 'zod';

/**
 * Controller for permission-related operations
 */
export class PermissionController {
  private openFGAService: OpenFGAService;
  private authService: AuthService;

  /**
   * Create a new PermissionController
   *
   * @param openFGAService OpenFGA service
   * @param authService Auth service
   */
  constructor(openFGAService: OpenFGAService, authService: AuthService) {
    this.openFGAService = openFGAService;
    this.authService = authService;
  }

  /**
   * Check if a user has permission to perform an action on a resource
   *
   * @param req Express request
   * @param res Express response
   */
  public checkPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = z.object({
        user: z.string(),
        relation: z.string(),
        object: z.string(),
        contextualTuples: z.array(
          z.object({
            user: z.string(),
            relation: z.string(),
            object: z.string()
          })
        ).optional()
      });

      const validatedData = validateRequest(req.body, schema);

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Check permission
      // Note: contextualTuples is not used in the current implementation
      const allowed = await this.openFGAService.check(
        tenantId,
        validatedData.user,
        validatedData.relation,
        validatedData.object
      );

      res.status(200).json({
        status: 'success',
        allowed
      });
    } catch (error) {
      logger.error('Error checking permission:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'check_permission_failed'
      });
    }
  };

  /**
   * Create a relationship between a user and a resource
   *
   * @param req Express request
   * @param res Express response
   */
  public createRelationship = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = z.object({
        user: z.string(),
        relation: z.string(),
        object: z.string()
      });

      const validatedData = validateRequest(req.body, schema);

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to create relationships
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token, tenantId);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to create relationships
      const hasPermission = await this.openFGAService.check(
        tenantId,
        `user:${userInfo.user.id}`,
        'can_manage_permissions',
        'system:permissions'
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Create relationship
      await this.openFGAService.write(
        tenantId,
        validatedData.user,
        validatedData.relation,
        validatedData.object
      );

      res.status(200).json({
        status: 'success',
        message: 'Relationship created successfully'
      });
    } catch (error) {
      logger.error('Error creating relationship:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'create_relationship_failed'
      });
    }
  };

  /**
   * Delete a relationship between a user and a resource
   *
   * @param req Express request
   * @param res Express response
   */
  public deleteRelationship = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = z.object({
        user: z.string(),
        relation: z.string(),
        object: z.string()
      });

      const validatedData = validateRequest(req.body, schema);

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to delete relationships
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token, tenantId);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to delete relationships
      const hasPermission = await this.openFGAService.check(
        tenantId,
        `user:${userInfo.user.id}`,
        'can_manage_permissions',
        'system:permissions'
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // Delete relationship
      await this.openFGAService.delete(
        tenantId,
        validatedData.user,
        validatedData.relation,
        validatedData.object
      );

      res.status(200).json({
        status: 'success',
        message: 'Relationship deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting relationship:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'delete_relationship_failed'
      });
    }
  };

  /**
   * List relationships for a user
   *
   * @param req Express request
   * @param res Express response
   */
  public listRelationships = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = z.object({
        user: z.string(),
        relation: z.string().optional(),
        objectType: z.string().optional()
      });

      const validatedData = validateRequest(req.query, schema);

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to list relationships
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token, tenantId);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to list relationships
      const hasPermission = await this.openFGAService.check(
        tenantId,
        `user:${userInfo.user.id}`,
        'can_view_permissions',
        'system:permissions'
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // List relationships
      const relationships = await this.openFGAService.listObjects(
        tenantId,
        validatedData.user,
        validatedData.relation,
        validatedData.objectType
      );

      res.status(200).json({
        status: 'success',
        relationships
      });
    } catch (error) {
      logger.error('Error listing relationships:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'list_relationships_failed'
      });
    }
  };

  /**
   * List users with a relationship to an object
   *
   * @param req Express request
   * @param res Express response
   */
  public listUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = z.object({
        object: z.string(),
        relation: z.string().optional(),
        userType: z.string().optional()
      });

      const validatedData = validateRequest(req.query, schema);

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({
          status: 'error',
          message: 'Missing tenant ID',
          code: 'missing_tenant_id'
        });
        return;
      }

      // Verify the user has permission to list users
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
          code: 'unauthorized'
        });
        return;
      }

      const userInfo = await this.authService.validateToken(token, tenantId);
      if (!userInfo) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid token',
          code: 'invalid_token'
        });
        return;
      }

      // Check if the user has permission to list users
      const hasPermission = await this.openFGAService.check(
        tenantId,
        `user:${userInfo.user.id}`,
        'can_view_permissions',
        'system:permissions'
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden',
          code: 'forbidden'
        });
        return;
      }

      // List users
      const users = await this.openFGAService.listUsers(
        tenantId,
        validatedData.object,
        validatedData.relation,
        validatedData.userType
      );

      res.status(200).json({
        status: 'success',
        users
      });
    } catch (error) {
      logger.error('Error listing users:', error);
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'list_users_failed'
      });
    }
  };
}
