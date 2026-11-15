//! Connection establishment between NL nodes.
//!
//! Two nodes try a fixed ladder of routes, cheapest and most private first, and
//! fall back to relaying through the gateway only when every direct route has
//! failed (see docs/architecture.md, "连接建立"). This crate owns that policy;
//! the concrete transports (mDNS, QUIC, hole punching, relay) plug in through
//! the `attempt` callback of [`establish`], so the policy is tested without
//! touching the network.

/// One way of reaching a peer. Variants are declared in ladder order.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Route {
    /// Same local network, discovered over mDNS.
    LanDirect,
    /// Peer reachable on a public IPv6 or IPv4 address.
    PublicDirect,
    /// Port opened on the router through UPnP or NAT-PMP.
    PortMapping,
    /// UDP hole punching coordinated over STUN.
    HolePunch,
    /// Traffic relayed through the gateway; always the last resort.
    Relay,
}

impl Route {
    /// Every route, in the order they are attempted.
    pub const LADDER: [Route; 5] = [
        Route::LanDirect,
        Route::PublicDirect,
        Route::PortMapping,
        Route::HolePunch,
        Route::Relay,
    ];
}

/// How capable the local node is of running the full ladder.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeClass {
    /// Desktop, mobile, and cloud nodes: every route is available.
    Full,
    /// Microcontrollers such as the ESP32. NAT traversal is too costly in RAM
    /// and code size, so they only talk to a node on the same LAN or go
    /// straight to the gateway relay.
    Constrained,
}

/// Routes a node of the given class should try, in order.
pub fn routes_for(class: NodeClass) -> impl Iterator<Item = Route> {
    Route::LADDER.into_iter().filter(move |route| match class {
        NodeClass::Full => true,
        NodeClass::Constrained => matches!(route, Route::LanDirect | Route::Relay),
    })
}

/// Why no route could be established: every attempted route with its error,
/// in the order they were tried.
#[derive(Debug, PartialEq, Eq)]
pub struct AllRoutesFailed<E> {
    pub attempts: Vec<(Route, E)>,
}

/// Tries `routes` in order and returns the first connection that succeeds,
/// together with the route that produced it.
///
/// Attempts run sequentially on purpose: an earlier route is preferred whenever
/// it works, and relaying costs gateway bandwidth, so a later route is only
/// worth trying once the earlier ones have actually failed.
pub async fn establish<C, E, F, Fut>(
    routes: impl IntoIterator<Item = Route>,
    mut attempt: F,
) -> Result<(Route, C), AllRoutesFailed<E>>
where
    F: FnMut(Route) -> Fut,
    Fut: Future<Output = Result<C, E>>,
{
    let mut attempts = Vec::new();
    for route in routes {
        match attempt(route).await {
            Ok(connection) => return Ok((route, connection)),
            Err(error) => attempts.push((route, error)),
        }
    }
    Err(AllRoutesFailed { attempts })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_nodes_try_every_route_in_ladder_order() {
        let routes: Vec<_> = routes_for(NodeClass::Full).collect();
        assert_eq!(routes, Route::LADDER);
    }

    #[test]
    fn constrained_nodes_only_use_lan_then_relay() {
        let routes: Vec<_> = routes_for(NodeClass::Constrained).collect();
        assert_eq!(routes, [Route::LanDirect, Route::Relay]);
    }

    #[tokio::test]
    async fn first_successful_route_wins_and_later_routes_are_not_tried() {
        let mut tried = Vec::new();
        let result = establish(routes_for(NodeClass::Full), |route| {
            tried.push(route);
            async move {
                if route == Route::PortMapping {
                    Ok("conn")
                } else {
                    Err("unreachable")
                }
            }
        })
        .await;

        assert_eq!(result, Ok((Route::PortMapping, "conn")));
        assert_eq!(
            tried,
            [Route::LanDirect, Route::PublicDirect, Route::PortMapping]
        );
    }

    #[tokio::test]
    async fn relay_is_used_when_every_direct_route_fails() {
        let result = establish(routes_for(NodeClass::Full), |route| async move {
            if route == Route::Relay {
                Ok(())
            } else {
                Err(())
            }
        })
        .await;
        assert_eq!(result, Ok((Route::Relay, ())));
    }

    #[tokio::test]
    async fn total_failure_reports_every_attempt_in_order() {
        let result: Result<(Route, ()), _> =
            establish(routes_for(NodeClass::Constrained), |route| async move {
                Err(route)
            })
            .await;
        assert_eq!(
            result,
            Err(AllRoutesFailed {
                attempts: vec![
                    (Route::LanDirect, Route::LanDirect),
                    (Route::Relay, Route::Relay)
                ],
            })
        );
    }
}
