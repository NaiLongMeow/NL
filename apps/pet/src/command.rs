//! Commands the pet's web page can send to the native window over IPC.

/// An action requested by the page through `window.ipc.postMessage`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PetCommand {
    /// Start moving the window with the mouse (sent on mouse down).
    Drag,
    /// Close the pet.
    Quit,
}

impl PetCommand {
    /// Parses a raw IPC message. Unknown messages are ignored rather than
    /// treated as errors, so a newer page can talk to an older binary.
    pub fn parse(message: &str) -> Option<Self> {
        match message {
            "drag" => Some(Self::Drag),
            "quit" => Some(Self::Quit),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_messages_map_to_commands() {
        assert_eq!(PetCommand::parse("drag"), Some(PetCommand::Drag));
        assert_eq!(PetCommand::parse("quit"), Some(PetCommand::Quit));
    }

    #[test]
    fn unknown_or_differently_cased_messages_are_ignored() {
        for message in ["", "Drag", "QUIT", "drag ", "resize"] {
            assert_eq!(PetCommand::parse(message), None, "{message:?}");
        }
    }
}
