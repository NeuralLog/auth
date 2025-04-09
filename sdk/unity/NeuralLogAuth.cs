using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

namespace NeuralLog.Auth
{
    /// <summary>
    /// Client SDK for NeuralLog Auth Service
    /// </summary>
    public class AuthClient
    {
        private readonly string _authServiceUrl;
        private readonly string _tenantId;
        private readonly string _token;
        private readonly Dictionary<string, CacheEntry> _cache = new Dictionary<string, CacheEntry>();
        private readonly int _cacheTtlSeconds;

        /// <summary>
        /// Create a new AuthClient
        /// </summary>
        /// <param name="authServiceUrl">URL of the auth service</param>
        /// <param name="tenantId">Tenant ID</param>
        /// <param name="token">Authorization token (optional)</param>
        /// <param name="cacheTtlSeconds">Cache TTL in seconds (default: 300)</param>
        public AuthClient(string authServiceUrl, string tenantId, string token = null, int cacheTtlSeconds = 300)
        {
            _authServiceUrl = authServiceUrl;
            _tenantId = tenantId;
            _token = token;
            _cacheTtlSeconds = cacheTtlSeconds;
        }

        /// <summary>
        /// Check if a user has permission to access a resource
        /// </summary>
        /// <param name="user">User identifier</param>
        /// <param name="permission">Permission to check</param>
        /// <param name="resource">Resource identifier</param>
        /// <param name="contextualTuples">Contextual tuples (optional)</param>
        /// <returns>True if the user has permission, False otherwise</returns>
        public async Task<bool> Check(string user, string permission, string resource, List<Dictionary<string, string>> contextualTuples = null)
        {
            // Map permission to relation
            string relation = MapPermissionToRelation(permission);

            // Generate cache key
            string cacheKey = GetCacheKey(user, relation, resource);

            // Check cache first
            if (_cache.TryGetValue(cacheKey, out CacheEntry entry) && !entry.IsExpired())
            {
                return entry.Allowed;
            }

            try
            {
                // Create request
                var checkRequest = new CheckRequest
                {
                    User = user,
                    Relation = relation,
                    Object = resource,
                    ContextualTuples = contextualTuples ?? new List<Dictionary<string, string>>()
                };

                // Call auth service
                var response = await SendRequest<CheckResponse>("/api/auth/check", "POST", checkRequest);

                // Cache the result
                _cache[cacheKey] = new CacheEntry(response.Allowed, DateTime.Now.AddSeconds(_cacheTtlSeconds));

                return response.Allowed;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Error checking permission: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Grant a permission to a user
        /// </summary>
        /// <param name="user">User identifier</param>
        /// <param name="permission">Permission to grant</param>
        /// <param name="resource">Resource identifier</param>
        /// <returns>True if the permission was granted, False otherwise</returns>
        public async Task<bool> Grant(string user, string permission, string resource)
        {
            // Map permission to relation
            string relation = MapPermissionToRelation(permission);

            try
            {
                // Create request
                var grantRequest = new GrantRequest
                {
                    User = user,
                    Relation = relation,
                    Object = resource
                };

                // Call auth service
                var response = await SendRequest<GrantResponse>("/api/auth/grant", "POST", grantRequest);

                // Invalidate cache
                if (response.Status == "success")
                {
                    InvalidateCache(user, relation, resource);
                }

                return response.Status == "success";
            }
            catch (Exception ex)
            {
                Debug.LogError($"Error granting permission: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Revoke a permission from a user
        /// </summary>
        /// <param name="user">User identifier</param>
        /// <param name="permission">Permission to revoke</param>
        /// <param name="resource">Resource identifier</param>
        /// <returns>True if the permission was revoked, False otherwise</returns>
        public async Task<bool> Revoke(string user, string permission, string resource)
        {
            // Map permission to relation
            string relation = MapPermissionToRelation(permission);

            try
            {
                // Create request
                var revokeRequest = new RevokeRequest
                {
                    User = user,
                    Relation = relation,
                    Object = resource
                };

                // Call auth service
                var response = await SendRequest<RevokeResponse>("/api/auth/revoke", "POST", revokeRequest);

                // Invalidate cache
                if (response.Status == "success")
                {
                    InvalidateCache(user, relation, resource);
                }

                return response.Status == "success";
            }
            catch (Exception ex)
            {
                Debug.LogError($"Error revoking permission: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Get auth headers for API requests
        /// </summary>
        /// <returns>Dictionary of headers</returns>
        public Dictionary<string, string> GetAuthHeaders()
        {
            var headers = new Dictionary<string, string>
            {
                { "X-Tenant-ID", _tenantId }
            };

            if (!string.IsNullOrEmpty(_token))
            {
                headers.Add("Authorization", $"Bearer {_token}");
            }

            return headers;
        }

        /// <summary>
        /// Send a request to the auth service
        /// </summary>
        private async Task<T> SendRequest<T>(string path, string method, object data = null)
        {
            string url = _authServiceUrl + path;
            string jsonData = data != null ? JsonConvert.SerializeObject(data) : null;

            using (UnityWebRequest request = new UnityWebRequest(url, method))
            {
                if (data != null)
                {
                    byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
                    request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                }

                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("X-Tenant-ID", _tenantId);

                if (!string.IsNullOrEmpty(_token))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {_token}");
                }

                await request.SendWebRequest();

                if (request.result != UnityWebRequest.Result.Success)
                {
                    throw new Exception($"Request failed: {request.error}");
                }

                return JsonConvert.DeserializeObject<T>(request.downloadHandler.text);
            }
        }

        /// <summary>
        /// Map permission to relation
        /// </summary>
        private string MapPermissionToRelation(string permission)
        {
            switch (permission)
            {
                case "read":
                    return "reader";
                case "write":
                    return "writer";
                case "admin":
                    return "admin";
                case "owner":
                    return "owner";
                default:
                    return permission;
            }
        }

        /// <summary>
        /// Generate a cache key
        /// </summary>
        private string GetCacheKey(string user, string relation, string resource)
        {
            return $"{_tenantId}:{user}:{relation}:{resource}";
        }

        /// <summary>
        /// Invalidate cache for a specific permission
        /// </summary>
        private void InvalidateCache(string user, string relation, string resource)
        {
            string cacheKey = GetCacheKey(user, relation, resource);
            _cache.Remove(cacheKey);
        }

        /// <summary>
        /// Cache entry
        /// </summary>
        private class CacheEntry
        {
            public bool Allowed { get; }
            public DateTime ExpiresAt { get; }

            public CacheEntry(bool allowed, DateTime expiresAt)
            {
                Allowed = allowed;
                ExpiresAt = expiresAt;
            }

            public bool IsExpired()
            {
                return DateTime.Now > ExpiresAt;
            }
        }

        /// <summary>
        /// Check request
        /// </summary>
        private class CheckRequest
        {
            [JsonProperty("user")]
            public string User { get; set; }

            [JsonProperty("relation")]
            public string Relation { get; set; }

            [JsonProperty("object")]
            public string Object { get; set; }

            [JsonProperty("contextualTuples")]
            public List<Dictionary<string, string>> ContextualTuples { get; set; }
        }

        /// <summary>
        /// Check response
        /// </summary>
        private class CheckResponse
        {
            [JsonProperty("status")]
            public string Status { get; set; }

            [JsonProperty("allowed")]
            public bool Allowed { get; set; }
        }

        /// <summary>
        /// Grant request
        /// </summary>
        private class GrantRequest
        {
            [JsonProperty("user")]
            public string User { get; set; }

            [JsonProperty("relation")]
            public string Relation { get; set; }

            [JsonProperty("object")]
            public string Object { get; set; }
        }

        /// <summary>
        /// Grant response
        /// </summary>
        private class GrantResponse
        {
            [JsonProperty("status")]
            public string Status { get; set; }

            [JsonProperty("message")]
            public string Message { get; set; }
        }

        /// <summary>
        /// Revoke request
        /// </summary>
        private class RevokeRequest
        {
            [JsonProperty("user")]
            public string User { get; set; }

            [JsonProperty("relation")]
            public string Relation { get; set; }

            [JsonProperty("object")]
            public string Object { get; set; }
        }

        /// <summary>
        /// Revoke response
        /// </summary>
        private class RevokeResponse
        {
            [JsonProperty("status")]
            public string Status { get; set; }

            [JsonProperty("message")]
            public string Message { get; set; }
        }
    }
}
