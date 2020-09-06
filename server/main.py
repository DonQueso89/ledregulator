import json
import logging
import os
import pathlib
from typing import Optional, List, Tuple

from fastapi import FastAPI
from pydantic import BaseModel, ValidationError
from fastapi.middleware.cors import CORSMiddleware


CFG_FILE = "led_sequence.cfg"
folder_path = os.path.dirname(os.path.realpath(__file__))
sequence_path = folder_path / pathlib.Path(CFG_FILE)

logger = logging.getLogger(__file__)


class LedRegulatorSequence(BaseModel):
    color: str
    initial_brightness: float
    sequence: List[Tuple[float, int]] # (target brightness, time to get there)


def _get_sequence() -> Optional[LedRegulatorSequence]:
    try:
        led_sequence = LedRegulatorSequence(**json.loads(open(sequence_path).read()))
        logger.warning(f"Found {CFG_FILE}\n" + json.dumps(led_sequence.dict(), indent=2, sort_keys=True))
    except IOError:
        logger.warning("No led_sequence.cfg found, setting to null")
        led_sequence = None
    except ValidationError as e:
        logger.warning(e.json())
        led_sequence = None
    except ValueError as e:
        logger.warning("led_sequence.cfg found, but not JSON parseable")
        led_sequence = None

    return led_sequence


def _set_sequence(sequence: LedRegulatorSequence):
    try:
        with open(sequence_path, 'w+') as fp:
            json.dump(sequence.dict(), fp)
    except IOError:
        logger.warning("Error while writing ledsequence to file")
        led_sequence = None
    except ValueError:
        logger.warning("led_sequence not JSON serializable")
        led_sequence = None
    return _get_sequence()


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=LedRegulatorSequence)
async def get_sequence():
    seq = _get_sequence()
    return seq and seq.dict()


@app.post("/")
async def set_sequence(sequence: LedRegulatorSequence):
    seq = _set_sequence(sequence)
    return seq and seq.dict()


@app.post("/reset/")
async def reset_sequence():
    led_sequence = None
    if os.path.exists(sequence_path):
        os.remove(sequence_path)
    else:
        logger.warning("Reset invoked, but file does not exist")
    return {}
