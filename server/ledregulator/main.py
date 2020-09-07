import json
import logging
import os
import pathlib
import threading, queue
import operator
import time
from typing import Optional, List, Tuple
from unittest.mock import MagicMock

from fastapi import FastAPI
from pydantic import BaseModel, ValidationError
from fastapi.middleware.cors import CORSMiddleware

try:
    import board
    import neopixel
except ModuleNotFoundError:
    board = MagicMock()
    neopixel = MagicMock()


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
    config_queue.put(seq)
    return seq and seq.dict()


@app.post("/reset/")
async def reset_sequence():
    led_sequence = None
    if os.path.exists(sequence_path):
        os.remove(sequence_path)
    else:
        logger.warning("Reset invoked, but file does not exist")
    return {}


pixel_pin = board.D18
 
num_pixels = 10
 
ORDER = neopixel.GRB
SMOOTHNESS = 10  # increments per second

pixels = neopixel.NeoPixel(
    pixel_pin, num_pixels, brightness=0.0, auto_write=False, pixel_order=neopixel.GRB
)

def to_grb_tuple(s):
    return int(s[3:5], 16), int(s[1:3], 16), int(s[5:], 16)


config_queue = queue.Queue()

def init_config(config: LedRegulatorSequence):
    # signal that new config is being initialised
    for _ in range(3):
        pixels.fill((255, 0, 0))
        pixels.brightness = 1
        pixels.show()
        time.sleep(0.5)
        pixels.brightness = 0
        pixels.show()
        time.sleep(0.5)

    pixels.fill(to_grb_tuple(config.color))
    pixels.brightness = config.initial_brightness
    pixels.show()


def worker():
    current_config = _get_sequence()
    sleep_time = 1/SMOOTHNESS
    init_config(current_config)
    while True:
        try:
            current_config = config_queue.get(timeout=0.1)    
            logger.warning(f"New task found. Continuing with\n{current_config}")
            init_config(current_config)
        except queue.Empty:
            logger.warning(f"No new task found. Continuing with\n{current_config}")

        pixels.brightness = current_config.initial_brightness
        pixels.show()
        for target, seconds in current_config.sequence:
            delta = (target - pixels.brightness) / (seconds * SMOOTHNESS)
            op_func = operator.gt if target < pixels.brightness else operator.lt
            logger.warning(f"Computed delta {delta} and op_func {op_func} from {target} and {seconds}\n")
            while op_func(pixels.brightness, target or 0.01):
                logger.warning(f"running cur brightness {pixels.brightness}")
                pixels.brightness += delta
                pixels.show()
                time.sleep(sleep_time)

sequencer = threading.Thread(target=worker, daemon=True)
sequencer.start()