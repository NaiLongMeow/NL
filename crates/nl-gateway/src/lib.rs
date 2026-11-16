//! NL gateway.
//!
//! The one central service: user login, the API key vault, push notifications
//! to mobile, and the relay that nodes fall back to when no direct route works
//! (see docs/architecture.md). For now it only exposes a health endpoint that
//! load balancers and container orchestrators can probe.

use axum::{Json, Router, routing::get};
use serde::Serialize;

/// Body of `GET /healthz`.
#[derive(Debug, Serialize)]
pub struct Health {
    pub status: &'static str,
    /// Crate version, so operators can see which release is running.
    pub version: &'static str,
}

/// HTTP routes served by this process.
pub fn router() -> Router {
    Router::new().route("/healthz", get(healthz))
}

async fn healthz() -> Json<Health> {
    Json(Health {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn healthz_reports_ok_and_version() {
        let response = router()
            .oneshot(Request::get("/healthz").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["status"], "ok");
        assert_eq!(json["version"], env!("CARGO_PKG_VERSION"));
    }

    #[tokio::test]
    async fn unknown_paths_are_not_found() {
        let response = router()
            .oneshot(Request::get("/nope").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
