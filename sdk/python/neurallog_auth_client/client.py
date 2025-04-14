import requests
from typing import Dict, List, Optional, Any, Union
from cachetools import TTLCache
import logging

logger = logging.getLogger(__name__)

class AuthClient:
    """Client SDK for NeuralLog Auth Service"""
    
    def __init__(
        self,
        auth_service_url: str,
        tenant_id: str,
        token: Optional[str] = None,
        cache_ttl: int = 300,
        cache_maxsize: int = 1000
    ):
        """
        Initialize the auth client
        
        Args:
            auth_service_url: URL of the auth service
            tenant_id: Tenant ID
            token: Authorization token (optional)
            cache_ttl: Cache TTL in seconds (default: 300)
            cache_maxsize: Maximum cache size (default: 1000)
        """
        self.auth_service_url = auth_service_url
        self.tenant_id = tenant_id
        self.token = token
        
        # Initialize cache
        self.cache = TTLCache(maxsize=cache_maxsize, ttl=cache_ttl)
        
        # Set up headers
        self.headers = {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenant_id
        }
        
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
    
    def check(
        self,
        user: str,
        permission: str,
        resource: str,
        contextual_tuples: Optional[List[Dict[str, str]]] = None
    ) -> bool:
        """
        Check if a user has permission to access a resource
        
        Args:
            user: User identifier
            permission: Permission to check
            resource: Resource identifier
            contextual_tuples: Contextual tuples (optional)
            
        Returns:
            True if the user has permission, False otherwise
        """
        # Map permission to relation
        relation = self._map_permission_to_relation(permission)
        
        # Generate cache key
        cache_key = self._get_cache_key(user, relation, resource)
        
        # Check cache first
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        try:
            # Call auth service
            response = requests.post(
                f"{self.auth_service_url}/api/auth/check",
                headers=self.headers,
                json={
                    "user": user,
                    "relation": relation,
                    "object": resource,
                    "contextualTuples": contextual_tuples or []
                }
            )
            
            # Check response
            if response.status_code == 200:
                result = response.json()
                allowed = result.get("allowed", False)
                
                # Cache the result
                self.cache[cache_key] = allowed
                
                return allowed
            else:
                logger.error(f"Error checking permission: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error checking permission: {str(e)}")
            return False
    
    def grant(self, user: str, permission: str, resource: str) -> bool:
        """
        Grant a permission to a user
        
        Args:
            user: User identifier
            permission: Permission to grant
            resource: Resource identifier
            
        Returns:
            True if the permission was granted, False otherwise
        """
        # Map permission to relation
        relation = self._map_permission_to_relation(permission)
        
        try:
            # Call auth service
            response = requests.post(
                f"{self.auth_service_url}/api/auth/grant",
                headers=self.headers,
                json={
                    "user": user,
                    "relation": relation,
                    "object": resource
                }
            )
            
            # Check response
            if response.status_code == 200:
                result = response.json()
                success = result.get("status") == "success"
                
                # Invalidate cache
                if success:
                    self._invalidate_cache(user, relation, resource)
                
                return success
            else:
                logger.error(f"Error granting permission: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error granting permission: {str(e)}")
            return False
    
    def revoke(self, user: str, permission: str, resource: str) -> bool:
        """
        Revoke a permission from a user
        
        Args:
            user: User identifier
            permission: Permission to revoke
            resource: Resource identifier
            
        Returns:
            True if the permission was revoked, False otherwise
        """
        # Map permission to relation
        relation = self._map_permission_to_relation(permission)
        
        try:
            # Call auth service
            response = requests.post(
                f"{self.auth_service_url}/api/auth/revoke",
                headers=self.headers,
                json={
                    "user": user,
                    "relation": relation,
                    "object": resource
                }
            )
            
            # Check response
            if response.status_code == 200:
                result = response.json()
                success = result.get("status") == "success"
                
                # Invalidate cache
                if success:
                    self._invalidate_cache(user, relation, resource)
                
                return success
            else:
                logger.error(f"Error revoking permission: {response.status_code} {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error revoking permission: {str(e)}")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """
        Get auth headers for API requests
        
        Returns:
            Dictionary of headers
        """
        return {
            "X-Tenant-ID": self.tenant_id
        }
    
    def _map_permission_to_relation(self, permission: str) -> str:
        """
        Map permission to relation
        
        Args:
            permission: Permission name
            
        Returns:
            Relation name
        """
        permission_map = {
            "read": "reader",
            "write": "writer",
            "admin": "admin",
            "owner": "owner"
        }
        
        return permission_map.get(permission, permission)
    
    def _get_cache_key(self, user: str, relation: str, resource: str) -> str:
        """
        Generate a cache key
        
        Args:
            user: User identifier
            relation: Relation name
            resource: Resource identifier
            
        Returns:
            Cache key
        """
        return f"{self.tenant_id}:{user}:{relation}:{resource}"
    
    def _invalidate_cache(self, user: str, relation: str, resource: str) -> None:
        """
        Invalidate cache for a specific permission
        
        Args:
            user: User identifier
            relation: Relation name
            resource: Resource identifier
        """
        cache_key = self._get_cache_key(user, relation, resource)
        if cache_key in self.cache:
            del self.cache[cache_key]
